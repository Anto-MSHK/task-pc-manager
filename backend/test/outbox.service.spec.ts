import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OutboxService } from '../src/outbox/outbox.service';
import { OutboxEvent } from '../src/outbox/schemas/outbox-event.schema';
import { SyncFailure } from '../src/outbox/schemas/sync-failure.schema';
import { ClickhouseService } from '../src/clickhouse/clickhouse.service';
import { RedisService } from '../src/redis/redis.service';
import { silenceLogger } from './mocks';

const RETRY_DELAYS_MS = [100, 400, 1600, 5000, 15000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

function makeEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    _id: { toString: () => 'evt-id-1' },
    eventType: 'users.upserted',
    aggregateType: 'users',
    aggregateId: 'user-1',
    operation: 'upsert',
    payload: { id: 'user-1', email: 'a@b.com' },
    status: 'pending',
    attempts: 0,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as OutboxEvent;
}

describe('OutboxService', () => {
  let service: OutboxService;

  let outboxEventModel: {
    findOneAndUpdate: jest.Mock;
    updateMany: jest.Mock;
    new: jest.Mock;
    mockInstance: { save: jest.Mock };
  };
  let syncFailureModel: { updateMany: jest.Mock; create: jest.Mock };
  let clickhouseService: { insertRows: jest.Mock };
  let redisService: { getClient: jest.Mock };
  let redisClient: { keys: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    silenceLogger();

    const saveMock = jest.fn().mockResolvedValue(undefined);
    const outboxInstance = { save: saveMock };
    const OutboxModelMock = jest.fn().mockReturnValue(outboxInstance);
    (OutboxModelMock as jest.Mock & { findOneAndUpdate: jest.Mock }).findOneAndUpdate = jest.fn();
    (OutboxModelMock as jest.Mock & { updateMany: jest.Mock }).updateMany = jest.fn();
    outboxEventModel = OutboxModelMock as never;

    syncFailureModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: jest.fn().mockResolvedValue(undefined),
    };

    clickhouseService = { insertRows: jest.fn().mockResolvedValue(undefined) };

    redisClient = {
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(0),
    };
    redisService = { getClient: jest.fn().mockReturnValue(redisClient) };

    const module = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: getModelToken(OutboxEvent.name), useValue: outboxEventModel },
        { provide: getModelToken(SyncFailure.name), useValue: syncFailureModel },
        { provide: ClickhouseService, useValue: clickhouseService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(OutboxService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // enqueue
  // ─────────────────────────────────────────

  describe('enqueue', () => {
    it('creates an outbox event with status=pending and attempts=0', async () => {
      const input = {
        eventType: 'users.upserted',
        aggregateType: 'users' as const,
        aggregateId: 'user-1',
        payload: { id: 'user-1' },
      };

      await service.enqueue(input);

      expect(outboxEventModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', attempts: 0, operation: 'upsert' }),
      );
    });

    it('defaults operation to "upsert" when not provided', async () => {
      await service.enqueue({
        eventType: 'test',
        aggregateType: 'users',
        aggregateId: 'x',
        payload: {},
      });

      expect(outboxEventModel).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'upsert' }),
      );
    });
  });

  // ─────────────────────────────────────────
  // retryFailedSync
  // ─────────────────────────────────────────

  describe('retryFailedSync', () => {
    it('requeues all failed events when no id given', async () => {
      (outboxEventModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      const count = await service.retryFailedSync();

      expect(outboxEventModel.updateMany).toHaveBeenCalledWith(
        { status: 'failed' },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'pending', attempts: 0 }),
        }),
      );
      expect(syncFailureModel.updateMany).toHaveBeenCalledWith(
        { isResolved: false },
        expect.objectContaining({ $set: expect.objectContaining({ isResolved: true }) }),
      );
      expect(count).toBe(3);
    });

    it('requeues only the specific event when id given', async () => {
      (outboxEventModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const count = await service.retryFailedSync('evt-id-1');

      expect(outboxEventModel.updateMany).toHaveBeenCalledWith(
        { _id: 'evt-id-1', status: 'failed' },
        expect.anything(),
      );
      expect(syncFailureModel.updateMany).toHaveBeenCalledWith(
        { outboxEventId: 'evt-id-1', isResolved: false },
        expect.anything(),
      );
      expect(count).toBe(1);
    });
  });

  // ─────────────────────────────────────────
  // worker: direct invocation of private method
  // ─────────────────────────────────────────

  describe('processOnePendingEvent', () => {
    // Helper to call the private worker method directly
    const tick = (svc: OutboxService) =>
      (svc as unknown as { processOnePendingEvent(): Promise<void> }).processOnePendingEvent();

    it('syncs event to ClickHouse and marks it done on success', async () => {
      const event = makeEvent();
      (outboxEventModel.findOneAndUpdate as jest.Mock).mockResolvedValue(event);

      await tick(service);

      expect(clickhouseService.insertRows).toHaveBeenCalledWith('users', [event.payload]);
      expect(event.status).toBe('done');
      expect(event.save).toHaveBeenCalled();
    });

    it('invalidates the matching analytics cache namespaces after successful sync', async () => {
      const event = makeEvent({ aggregateType: 'promo_usages' });
      (outboxEventModel.findOneAndUpdate as jest.Mock).mockResolvedValue(event);
      redisClient.keys.mockResolvedValue(['analytics:promo-usages:abc']);

      await tick(service);

      // promo_usages aggregate should invalidate users + promocodes + promo-usages + summary
      const queriedNamespaces = (redisClient.keys as jest.Mock).mock.calls.map((call) => call[0]);
      expect(queriedNamespaces).toEqual(
        expect.arrayContaining([
          'analytics:users:*',
          'analytics:promocodes:*',
          'analytics:promo-usages:*',
          'analytics:summary:*',
        ]),
      );
      expect(redisClient.del).toHaveBeenCalled();
    });

    // ─────────────────────────────────────────
    // Retry backoff
    // ─────────────────────────────────────────

    it('increments attempts and schedules nextRetryAt on transient CH error', async () => {
      const event = makeEvent();
      (outboxEventModel.findOneAndUpdate as jest.Mock).mockResolvedValue(event);
      clickhouseService.insertRows.mockRejectedValueOnce(new Error('CH timeout'));

      const beforeCall = Date.now();
      await tick(service);

      expect(event.status).toBe('failed');
      expect(event.attempts).toBe(1);
      expect(event.nextRetryAt).toBeDefined();
      expect((event.nextRetryAt as Date).getTime()).toBeGreaterThanOrEqual(
        beforeCall + RETRY_DELAYS_MS[0],
      );
    });

    // ─────────────────────────────────────────
    // DLQ after MAX_RETRIES
    // ─────────────────────────────────────────

    it('moves event to DLQ (sync_failures) after MAX_RETRIES consecutive failures', async () => {
      const event = makeEvent({ attempts: MAX_RETRIES - 1 });
      (outboxEventModel.findOneAndUpdate as jest.Mock).mockResolvedValue(event);
      clickhouseService.insertRows.mockRejectedValue(new Error('permanent failure'));

      await tick(service);

      expect(event.status).toBe('failed');
      expect(event.attempts).toBe(MAX_RETRIES);
      expect(syncFailureModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outboxEventId: 'evt-id-1',
          aggregateType: 'users',
          aggregateId: 'user-1',
          error: 'permanent failure',
        }),
      );
    });

    // ─────────────────────────────────────────
    // Reclaim stuck processing events
    // ─────────────────────────────────────────

    it('reclaims events stuck in processing > 60s (includes them in findOneAndUpdate filter)', async () => {
      (outboxEventModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await tick(service);

      const filterArg = (outboxEventModel.findOneAndUpdate as jest.Mock).mock.calls[0]?.[0] as {
        $or?: { status?: string; lockedAt?: object }[];
      };
      expect(filterArg).toBeDefined();

      const hasReclaimBranch = filterArg.$or?.some(
        (branch) => branch.status === 'processing' && branch.lockedAt !== undefined,
      );
      expect(hasReclaimBranch).toBe(true);
    });
  });
});
