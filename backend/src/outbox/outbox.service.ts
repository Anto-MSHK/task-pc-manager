import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { RedisService } from '../redis/redis.service';
import { OutboxEvent } from './schemas/outbox-event.schema';
import { SyncFailure } from './schemas/sync-failure.schema';

type AggregateType = 'users' | 'promocodes' | 'orders' | 'promo_usages';
type AnalyticsNamespace = 'users' | 'promocodes' | 'promo-usages' | 'summary' | 'series';

const ANALYTICS_NAMESPACES_BY_AGGREGATE: Record<AggregateType, AnalyticsNamespace[]> = {
  users: ['users', 'summary'],
  promocodes: ['promocodes', 'summary'],
  // Orders affect user spend aggregates, promocode revenue aggregates, and daily series.
  orders: ['users', 'promocodes', 'summary', 'series'],
  // Promo usage adds to all table aggregates, the summary, and daily series.
  promo_usages: ['users', 'promocodes', 'promo-usages', 'summary', 'series'],
};

interface EnqueueOutboxEventInput {
  eventType: string;
  aggregateType: AggregateType;
  aggregateId: string;
  operation?: 'upsert' | 'append';
  payload: Record<string, unknown>;
}

const RETRY_DELAYS_MS = [100, 400, 1600, 5000, 15000] as const;
const MAX_RETRIES = RETRY_DELAYS_MS.length;
const WORKER_TICK_MS = 400;
const STUCK_PROCESSING_THRESHOLD_MS = 60_000;

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private workerTimer?: NodeJS.Timeout;
  private isTickRunning = false;

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxEventModel: Model<OutboxEvent>,
    @InjectModel(SyncFailure.name)
    private readonly syncFailureModel: Model<SyncFailure>,
    private readonly clickhouseService: ClickhouseService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit(): void {
    this.workerTimer = setInterval(() => {
      if (this.isTickRunning) {
        return;
      }
      this.isTickRunning = true;
      void this.processOnePendingEvent().finally(() => {
        this.isTickRunning = false;
      });
    }, WORKER_TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
    }
  }

  async enqueue(input: EnqueueOutboxEventInput, session?: ClientSession): Promise<OutboxEvent> {
    const event = new this.outboxEventModel({
      ...input,
      operation: input.operation ?? 'upsert',
      status: 'pending',
      attempts: 0,
    });

    return event.save({ session });
  }

  async retryFailedSync(id?: string): Promise<number> {
    const now = new Date();
    const outboxFilter = id ? { _id: id, status: 'failed' } : { status: 'failed' };
    const updateResult = await this.outboxEventModel.updateMany(outboxFilter, {
      $set: {
        status: 'pending',
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
        lockedAt: null,
      },
    });

    const failureFilter = id ? { outboxEventId: id, isResolved: false } : { isResolved: false };
    await this.syncFailureModel.updateMany(failureFilter, {
      $set: { isResolved: true, resolvedAt: now },
    });

    this.logger.log(
      `Replay: requeued ${updateResult.modifiedCount} failed outbox event(s)${
        id ? ` (id=${id})` : ''
      }`,
    );
    return updateResult.modifiedCount;
  }

  private async processOnePendingEvent(): Promise<void> {
    const now = new Date();
    const stuckThreshold = new Date(now.getTime() - STUCK_PROCESSING_THRESHOLD_MS);

    const event = await this.outboxEventModel.findOneAndUpdate(
      {
        attempts: { $lt: MAX_RETRIES },
        $or: [
          {
            status: 'pending',
            $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
          },
          {
            status: 'failed',
            $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
          },
          {
            status: 'processing',
            lockedAt: { $lt: stuckThreshold },
          },
        ],
      },
      {
        $set: {
          status: 'processing',
          lockedAt: now,
        },
      },
      {
        sort: { createdAt: 1 },
        new: true,
      },
    );

    if (!event) {
      return;
    }

    const eventId = event._id.toString();

    try {
      await this.syncToClickhouse(event);

      event.status = 'done';
      event.lastError = undefined;
      event.nextRetryAt = undefined;
      event.lockedAt = undefined;
      await event.save();

      // Drop stale analytics caches so the new CH state is visible immediately.
      await this.invalidateAnalyticsCaches(event.aggregateType as AggregateType);

      this.logger.debug?.(
        `Synced outbox event ${eventId} (${event.aggregateType}/${event.aggregateId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      const nextAttempt = event.attempts + 1;

      if (nextAttempt >= MAX_RETRIES) {
        event.status = 'failed';
        event.attempts = nextAttempt;
        event.lastError = message;
        event.lockedAt = undefined;
        event.nextRetryAt = undefined;
        await event.save();

        await this.syncFailureModel.create({
          outboxEventId: eventId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          error: message,
        });

        this.logger.error(`Outbox event ${eventId} moved to DLQ: ${message}`);
        return;
      }

      event.status = 'failed';
      event.attempts = nextAttempt;
      event.lastError = message;
      event.lockedAt = undefined;
      event.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[nextAttempt - 1]);
      await event.save();

      this.logger.warn(
        `Outbox event ${eventId} failed (attempt ${nextAttempt}/${MAX_RETRIES}): ${message}`,
      );
    }
  }

  private async syncToClickhouse(event: OutboxEvent): Promise<void> {
    await this.clickhouseService.insertRows(event.aggregateType, [event.payload]);
  }

  private async invalidateAnalyticsCaches(aggregateType: AggregateType): Promise<void> {
    const namespaces = ANALYTICS_NAMESPACES_BY_AGGREGATE[aggregateType];
    if (!namespaces) {
      return;
    }

    const client = this.redisService.getClient();
    await Promise.all(
      namespaces.map(async (ns) => {
        const keys = await client.keys(`analytics:${ns}:*`);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }),
    );
  }
}
