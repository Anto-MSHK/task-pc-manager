import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { PromocodesService } from '../promocodes/promocodes.service';
import { Promocode } from '../promocodes/schemas/promocode.schema';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { OutboxService } from '../outbox/outbox.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { Order } from './schemas/order.schema';
import { PromoUsage } from './schemas/promo-usage.schema';

const APPLY_PROMO_LOCK_TTL_MS = 5000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(PromoUsage.name) private readonly promoUsageModel: Model<PromoUsage>,
    @InjectConnection() private readonly connection: Connection,
    private readonly usersService: UsersService,
    private readonly promocodesService: PromocodesService,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async findByUserId(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
    return orders.map((o) => new OrderResponseDto(o.toObject()));
  }

  async create(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const user = await this.usersService.ensureActiveById(userId);

    const session = await this.connection.startSession();
    let createdOrder!: Order;

    try {
      await session.withTransaction(async () => {
        const order = new this.orderModel({
          userId: new Types.ObjectId(userId),
          amount: this.roundMoney(dto.amount),
          discountAmount: 0,
          finalAmount: this.roundMoney(dto.amount),
        });
        createdOrder = await order.save({ session });

        await this.outboxService.enqueue(
          {
            eventType: 'orders.upserted',
            aggregateType: 'orders',
            aggregateId: createdOrder._id.toString(),
            operation: 'upsert',
            payload: {
              id: createdOrder._id.toString(),
              userId: user._id.toString(),
              userName: user.name,
              userEmail: user.email,
              promocodeId: null,
              promocodeCode: null,
              amount: createdOrder.amount,
              discountAmount: createdOrder.discountAmount,
              finalAmount: createdOrder.finalAmount,
              createdAt: createdOrder.createdAt.toISOString(),
              updatedAt: createdOrder.updatedAt.toISOString(),
            },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    await this.analyticsService.invalidateCache('users', 'summary', 'series');
    return new OrderResponseDto(createdOrder.toObject());
  }

  async applyPromocode(orderId: string, userId: string, code: string): Promise<OrderResponseDto> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('Order does not belong to current user');
    }

    if (order.promocodeId) {
      throw new ConflictException('Promocode is already applied to this order');
    }

    const user = await this.usersService.ensureActiveById(userId);
    const promo = await this.promocodesService.findByCode(code);
    if (!promo) {
      throw new NotFoundException('Promocode not found');
    }

    this.validatePromocodeActive(promo);

    const lockKey = `lock:apply-promo:${promo._id.toString()}`;
    const lockToken = await this.acquireLock(lockKey);
    if (!lockToken) {
      throw new ConflictException('Promocode is being applied right now, please retry');
    }

    const session = await this.connection.startSession();
    let updatedOrder!: Order;

    try {
      await session.withTransaction(async () => {
        await this.validatePromocodeLimits(promo, userId, session);
        const discountAmount = this.roundMoney((order.amount * promo.discountPercent) / 100);
        const finalAmount = this.roundMoney(order.amount - discountAmount);
        const now = new Date();

        const orderAfterPatch = await this.orderModel
          .findOneAndUpdate(
            {
              _id: new Types.ObjectId(orderId),
              userId: new Types.ObjectId(userId),
              promocodeId: { $exists: false },
            },
            {
              $set: {
                promocodeId: promo._id,
                discountAmount,
                finalAmount,
              },
            },
            { new: true, session },
          )
          .exec();

        if (!orderAfterPatch) {
          throw new ConflictException('Promocode already applied to this order');
        }

        const promoUsage = new this.promoUsageModel({
          promocodeId: promo._id,
          userId: new Types.ObjectId(userId),
          orderId: orderAfterPatch._id,
          discountAmount,
          usedAt: now,
        });
        await promoUsage.save({ session });

        updatedOrder = orderAfterPatch;

        await this.outboxService.enqueue(
          {
            eventType: 'orders.upserted',
            aggregateType: 'orders',
            aggregateId: updatedOrder._id.toString(),
            operation: 'upsert',
            payload: {
              id: updatedOrder._id.toString(),
              userId: user._id.toString(),
              userName: user.name,
              userEmail: user.email,
              promocodeId: promo._id.toString(),
              promocodeCode: promo.code,
              amount: updatedOrder.amount,
              discountAmount: updatedOrder.discountAmount,
              finalAmount: updatedOrder.finalAmount,
              createdAt: updatedOrder.createdAt.toISOString(),
              updatedAt: updatedOrder.updatedAt.toISOString(),
            },
          },
          session,
        );

        await this.outboxService.enqueue(
          {
            eventType: 'promo_usages.appended',
            aggregateType: 'promo_usages',
            aggregateId: promoUsage._id.toString(),
            operation: 'append',
            payload: {
              id: promoUsage._id.toString(),
              promocodeId: promo._id.toString(),
              promocodeCode: promo.code,
              userId: user._id.toString(),
              userName: user.name,
              userEmail: user.email,
              orderId: orderAfterPatch._id.toString(),
              discountAmount: promoUsage.discountAmount,
              usedAt: promoUsage.usedAt.toISOString(),
              createdAt: promoUsage.createdAt.toISOString(),
            },
          },
          session,
        );
      });
    } catch (error: unknown) {
      if (this.isDuplicateOrderPromoUsage(error)) {
        throw new ConflictException('Promocode already applied to this order');
      }
      throw error;
    } finally {
      await session.endSession();
      await this.releaseLock(lockKey, lockToken);
    }

    await this.analyticsService.invalidateCache();
    return new OrderResponseDto(updatedOrder.toObject());
  }

  private async validatePromocodeLimits(
    promocode: Promocode,
    userId: string,
    session?: ClientSession,
  ): Promise<void> {
    const [totalCount, perUserCount] = await Promise.all([
      this.promoUsageModel.countDocuments({ promocodeId: promocode._id }).session(session ?? null),
      this.promoUsageModel
        .countDocuments({ promocodeId: promocode._id, userId: new Types.ObjectId(userId) })
        .session(session ?? null),
    ]);

    if (typeof promocode.maxUsages === 'number' && totalCount >= promocode.maxUsages) {
      throw new BadRequestException('Promocode usage limit has been reached');
    }

    if (
      typeof promocode.maxUsagesPerUser === 'number' &&
      perUserCount >= promocode.maxUsagesPerUser
    ) {
      throw new BadRequestException('Promocode per-user limit has been reached');
    }
  }

  private validatePromocodeActive(promocode: Promocode): void {
    if (!promocode.isActive) {
      throw new BadRequestException('Promocode is inactive');
    }

    const now = new Date();
    if (promocode.dateFrom && now < promocode.dateFrom) {
      throw new BadRequestException('Promocode is not active yet');
    }
    if (promocode.dateTo && now > promocode.dateTo) {
      throw new BadRequestException('Promocode has expired');
    }
  }

  private async acquireLock(lockKey: string): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redisService
      .getClient()
      .set(lockKey, token, 'PX', APPLY_PROMO_LOCK_TTL_MS, 'NX');
    return result === 'OK' ? token : null;
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    await this.redisService.getClient().eval(
      `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
      `,
      1,
      lockKey,
      token,
    );
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isDuplicateOrderPromoUsage(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return error.message.includes('E11000') && error.message.includes('orderId');
  }
}
