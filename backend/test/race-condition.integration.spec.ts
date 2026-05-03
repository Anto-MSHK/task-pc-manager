import { ConflictException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { Order } from '../src/orders/schemas/order.schema';
import { PromoUsage } from '../src/orders/schemas/promo-usage.schema';
import { OrdersService } from '../src/orders/orders.service';
import { OutboxService } from '../src/outbox/outbox.service';
import { PromocodesService } from '../src/promocodes/promocodes.service';
import { RedisService } from '../src/redis/redis.service';
import { UsersService } from '../src/users/users.service';
import { silenceLogger } from './mocks';

const USER_ID = new Types.ObjectId().toString();
const PROMO_ID = new Types.ObjectId();

describe('OrdersService.applyPromocode race condition', () => {
  it('allows only 1 of 10 concurrent apply-promocode calls to acquire the promocode lock', async () => {
    silenceLogger();

    const orders = Array.from({ length: 10 }, () => {
      const orderId = new Types.ObjectId();
      return {
        _id: orderId,
        userId: new Types.ObjectId(USER_ID),
        amount: 100,
        discountAmount: 0,
        finalAmount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() {
          return { ...this };
        },
      };
    });
    const ordersById = new Map(orders.map((order) => [order._id.toString(), order]));
    let lockTaken = false;

    const orderModel = {
      findById: jest.fn((id: string) => ({
        exec: jest.fn().mockResolvedValue(ordersById.get(id) ?? null),
      })),
      findOneAndUpdate: jest.fn((filter: { _id: Types.ObjectId }) => {
        const order = ordersById.get(filter._id.toString());
        const updatedOrder = order
          ? {
              ...order,
              promocodeId: PROMO_ID,
              discountAmount: 10,
              finalAmount: 90,
              toObject() {
                return { ...this };
              },
            }
          : null;
        return { exec: jest.fn().mockResolvedValue(updatedOrder) };
      }),
    };

    const promoUsageInstance = {
      _id: new Types.ObjectId(),
      discountAmount: 10,
      usedAt: new Date(),
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const PromoUsageModelMock = jest.fn().mockReturnValue(promoUsageInstance);
    (PromoUsageModelMock as jest.Mock & { countDocuments: jest.Mock }).countDocuments = jest
      .fn()
      .mockReturnValue({ session: jest.fn().mockResolvedValue(0) });

    const redisClient = {
      set: jest.fn().mockImplementation(async () => {
        if (lockTaken) {
          return null;
        }
        lockTaken = true;
        return 'OK';
      }),
      eval: jest.fn().mockResolvedValue(1),
    };

    const session = {
      withTransaction: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(PromoUsage.name), useValue: PromoUsageModelMock },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn().mockResolvedValue(session) },
        },
        {
          provide: UsersService,
          useValue: {
            ensureActiveById: jest.fn().mockResolvedValue({
              _id: { toString: () => USER_ID },
              name: 'Race User',
              email: 'race@example.com',
            }),
          },
        },
        {
          provide: PromocodesService,
          useValue: {
            findByCode: jest.fn().mockResolvedValue({
              _id: PROMO_ID,
              code: 'RACE10',
              discountPercent: 10,
              isActive: true,
              maxUsages: 1,
              maxUsagesPerUser: undefined,
            }),
          },
        },
        { provide: RedisService, useValue: { getClient: () => redisClient } },
        { provide: OutboxService, useValue: { enqueue: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: AnalyticsService,
          useValue: { invalidateCache: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    const service = module.get(OrdersService);
    const results = await Promise.allSettled(
      orders.map((order) => service.applyPromocode(order._id.toString(), USER_ID, 'RACE10')),
    );

    const successes = results.filter((result) => result.status === 'fulfilled');
    const failures = results.filter((result) => result.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);
    expect(PromoUsageModelMock).toHaveBeenCalledTimes(1);
    expect(redisClient.set).toHaveBeenCalledTimes(10);

    for (const failure of failures) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    }
  });
});
