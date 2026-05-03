import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { OutboxService } from '../outbox/outbox.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { Promocode } from './schemas/promocode.schema';

@Injectable()
export class PromocodesService {
  constructor(
    @InjectModel(Promocode.name) private readonly promocodeModel: Model<Promocode>,
    @InjectConnection() private readonly connection: Connection,
    private readonly outboxService: OutboxService,
    private readonly clickhouseService: ClickhouseService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async create(dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    this.validateDateRange(dto.dateFrom, dto.dateTo);

    const code = dto.code.trim().toUpperCase();
    const exists = await this.promocodeModel.findOne({ code }).lean().exec();
    if (exists) {
      throw new ConflictException('Promocode already exists');
    }

    const session = await this.connection.startSession();
    let created!: Promocode;

    try {
      await session.withTransaction(async () => {
        const promocode = new this.promocodeModel({
          ...dto,
          code,
          isActive: true,
        });
        created = await promocode.save({ session });

        await this.outboxService.enqueue(
          {
            eventType: 'promocodes.upserted',
            aggregateType: 'promocodes',
            aggregateId: created._id.toString(),
            operation: 'upsert',
            payload: this.toOutboxPayload(created),
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    await this.analyticsService.invalidateCache('promocodes', 'summary');
    return new PromocodeResponseDto(created.toObject());
  }

  async findAll(): Promise<PromocodeResponseDto[]> {
    const rows = await this.promocodeModel.find().sort({ createdAt: -1 }).exec();
    return rows.map((row) => new PromocodeResponseDto(row.toObject()));
  }

  async findOne(id: string): Promise<PromocodeResponseDto> {
    const promocode = await this.findByIdOrFail(id);
    return new PromocodeResponseDto(promocode.toObject());
  }

  async update(id: string, dto: UpdatePromocodeDto): Promise<PromocodeResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field should be provided');
    }

    this.validateDateRange(dto.dateFrom, dto.dateTo);
    const current = await this.findByIdOrFail(id);

    if (dto.code) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== current.code) {
        const exists = await this.promocodeModel.findOne({ code: normalizedCode }).lean().exec();
        if (exists) {
          throw new ConflictException('Promocode already exists');
        }
      }
      dto.code = normalizedCode;
    }

    const session = await this.connection.startSession();
    let updated!: Promocode;

    try {
      await session.withTransaction(async () => {
        const row = await this.promocodeModel.findByIdAndUpdate(id, dto, { new: true, session });
        if (!row) {
          throw new NotFoundException('Promocode not found');
        }
        updated = row;

        await this.outboxService.enqueue(
          {
            eventType: 'promocodes.upserted',
            aggregateType: 'promocodes',
            aggregateId: updated._id.toString(),
            operation: 'upsert',
            payload: this.toOutboxPayload(updated),
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    await this.syncPromocodeCascade(updated);
    await this.analyticsService.invalidateCache();

    return new PromocodeResponseDto(updated.toObject());
  }

  async deactivate(id: string): Promise<PromocodeResponseDto> {
    return this.update(id, { isActive: false });
  }

  async findByCode(code: string): Promise<Promocode | null> {
    const normalizedCode = code.trim().toUpperCase();
    return this.promocodeModel.findOne({ code: normalizedCode }).exec();
  }

  async findByIdOrFail(id: string): Promise<Promocode> {
    const promocode = await this.promocodeModel.findById(id).exec();
    if (!promocode) {
      throw new NotFoundException('Promocode not found');
    }
    return promocode;
  }

  private validateDateRange(dateFrom?: Date, dateTo?: Date): void {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be less than or equal to dateTo');
    }
  }

  /**
   * When promocode code changes, re-insert denormalized rows in the orders CH table
   * (ReplacingMergeTree) so that orders.promocodeCode stays consistent.
   *
   * Note: promo_usages is an append-only MergeTree, so each row is a historical snapshot
   * of the promocode code at the moment of use; we intentionally don't rewrite it.
   */
  private async syncPromocodeCascade(promocode: Promocode): Promise<void> {
    const promocodeId = promocode._id.toString();

    type OrderRow = {
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      promocodeId: string | null;
      amount: number;
      discountAmount: number;
      finalAmount: number;
      createdAt: string;
      updatedAt: string;
    };

    const orders = await this.clickhouseService.queryRows<OrderRow>(
      `SELECT DISTINCT ON (id) id, userId, userName, userEmail, promocodeId,
              amount, discountAmount, finalAmount, createdAt, updatedAt
       FROM orders FINAL
       WHERE promocodeId = {promocodeId:String}`,
      { promocodeId },
    );

    if (orders.length === 0) {
      return;
    }

    const updatedOrders = orders.map((row) => ({
      ...row,
      promocodeCode: promocode.code,
    }));

    await this.clickhouseService.insertRows('orders', updatedOrders);
  }

  private toOutboxPayload(promocode: Promocode): Record<string, unknown> {
    return {
      id: promocode._id.toString(),
      code: promocode.code,
      discountPercent: promocode.discountPercent,
      maxUsages: promocode.maxUsages ?? null,
      maxUsagesPerUser: promocode.maxUsagesPerUser ?? null,
      dateFrom: promocode.dateFrom ? promocode.dateFrom.toISOString() : null,
      dateTo: promocode.dateTo ? promocode.dateTo.toISOString() : null,
      isActive: promocode.isActive ? 1 : 0,
      createdAt: promocode.createdAt.toISOString(),
      updatedAt: promocode.updatedAt.toISOString(),
    };
  }
}
