import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OrdersService } from '../src/orders/orders.service';
import { Order } from '../src/orders/schemas/order.schema';
import { PromoUsage } from '../src/orders/schemas/promo-usage.schema';
import { UsersService } from '../src/users/users.service';
import { PromocodesService } from '../src/promocodes/promocodes.service';
import { RedisService } from '../src/redis/redis.service';
import { OutboxService } from '../src/outbox/outbox.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { silenceLogger } from './mocks';

// ─── helpers ────────────────────────────────────────────────────────────────

const USER_ID = new Types.ObjectId().toString();
const OTHER_USER_ID = new Types.ObjectId().toString();
const ORDER_ID = new Types.ObjectId().toString();
const PROMO_ID = new Types.ObjectId();

function makePromo(overrides: Record<string, unknown> = {}) {
  return {
    _id: PROMO_ID,
    code: 'SUMMER20',
    discountPercent: 20,
    isActive: true,
    maxUsages: undefined,
    maxUsagesPerUser: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(ORDER_ID),
    userId: new Types.ObjectId(USER_ID),
    amount: 100,
    discountAmount: 0,
    finalAmount: 100,
    promocodeId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function () {
      return { ...this };
    },
    ...overrides,
  };
}

function makeUser() {
  return {
    _id: { toString: () => USER_ID },
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
  };
}

// ─── test suite ─────────────────────────────────────────────────────────────

describe('OrdersService.applyPromocode', () => {
  let service: OrdersService;

  let orderModel: {
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let promoUsageModel: {
    countDocuments: jest.Mock;
    new: jest.Mock;
    mockInstance: { save: jest.Mock };
  };
  let usersService: { ensureActiveById: jest.Mock };
  let promocodesService: { findByCode: jest.Mock };
  let redisClient: { set: jest.Mock; eval: jest.Mock };
  let outboxService: { enqueue: jest.Mock };

  beforeEach(async () => {
    silenceLogger();

    const saveMock = jest.fn().mockResolvedValue(undefined);
    const promoUsageInstance = { _id: new Types.ObjectId(), save: saveMock, discountAmount: 0, usedAt: new Date(), createdAt: new Date() };
    const PromoUsageModelMock = jest.fn().mockReturnValue(promoUsageInstance);
    (PromoUsageModelMock as jest.Mock & { countDocuments: jest.Mock }).countDocuments = jest.fn();
    promoUsageModel = PromoUsageModelMock as never;

    orderModel = {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    usersService = { ensureActiveById: jest.fn().mockResolvedValue(makeUser()) };
    promocodesService = { findByCode: jest.fn() };

    redisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };

    outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const sessionMock = {
      withTransaction: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connectionMock = {
      startSession: jest.fn().mockResolvedValue(sessionMock),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(PromoUsage.name), useValue: promoUsageModel },
        { provide: getConnectionToken(), useValue: connectionMock },
        { provide: UsersService, useValue: usersService },
        { provide: PromocodesService, useValue: promocodesService },
        { provide: RedisService, useValue: { getClient: () => redisClient } },
        { provide: OutboxService, useValue: outboxService },
        {
          provide: AnalyticsService,
          useValue: { invalidateCache: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(OrdersService);

    // Default: order exists, promo found, no usages yet, atomic update succeeds
    const order = makeOrder();
    (orderModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(order),
    });
    promocodesService.findByCode.mockResolvedValue(makePromo());
    (promoUsageModel.countDocuments as jest.Mock).mockReturnValue({
      session: jest.fn().mockResolvedValue(0),
    });
    const updatedOrder = makeOrder({ discountAmount: 20, finalAmount: 80, promocodeId: PROMO_ID });
    (orderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedOrder),
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── 1. Happy path ──────────────────────────────────────────────────────────

  it('1. happy path: applies promo, calculates 20% discount, enqueues 2 outbox events', async () => {
    const result = await service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20');

    expect(result.discountAmount).toBe(20);
    expect(result.finalAmount).toBe(80);
    expect(outboxService.enqueue).toHaveBeenCalledTimes(2);
    expect(outboxService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateType: 'orders' }),
      expect.anything(),
    );
    expect(outboxService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateType: 'promo_usages' }),
      expect.anything(),
    );
  });

  // ── 2. Order not found ─────────────────────────────────────────────────────

  it('2. throws NotFoundException when order does not exist', async () => {
    (orderModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ── 3. Order belongs to another user ──────────────────────────────────────

  it('3. throws ForbiddenException when order belongs to another user', async () => {
    (orderModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeOrder({ userId: new Types.ObjectId(OTHER_USER_ID) })),
    });

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ── 4. Promo already applied ───────────────────────────────────────────────

  it('4. throws ConflictException when order already has a promocode', async () => {
    (orderModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeOrder({ promocodeId: new Types.ObjectId() })),
    });

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      ConflictException,
    );
  });

  // ── 5. Promo code not found ────────────────────────────────────────────────

  it('5. throws NotFoundException when promocode does not exist', async () => {
    promocodesService.findByCode.mockResolvedValue(null);

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'BADCODE')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ── 6. Promo inactive ─────────────────────────────────────────────────────

  it('6. throws BadRequestException when promo isActive=false', async () => {
    promocodesService.findByCode.mockResolvedValue(makePromo({ isActive: false }));

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── 7. Promo not yet active (dateFrom in future) ───────────────────────────

  it('7. throws BadRequestException when dateFrom is in the future', async () => {
    const future = new Date(Date.now() + 86_400_000);
    promocodesService.findByCode.mockResolvedValue(makePromo({ dateFrom: future }));

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── 8. Promo expired (dateTo in past) ─────────────────────────────────────

  it('8. throws BadRequestException when dateTo is in the past', async () => {
    const past = new Date(Date.now() - 86_400_000);
    promocodesService.findByCode.mockResolvedValue(makePromo({ dateTo: past }));

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── 9. Global maxUsages reached ───────────────────────────────────────────

  it('9. throws BadRequestException when global maxUsages is reached', async () => {
    promocodesService.findByCode.mockResolvedValue(makePromo({ maxUsages: 5 }));
    (promoUsageModel.countDocuments as jest.Mock)
      .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(5) }) // total = 5 (limit)
      .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(0) }); // per-user = 0

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── 10. Per-user maxUsagesPerUser reached ─────────────────────────────────

  it('10. throws BadRequestException when per-user maxUsagesPerUser is reached', async () => {
    promocodesService.findByCode.mockResolvedValue(makePromo({ maxUsagesPerUser: 1 }));
    (promoUsageModel.countDocuments as jest.Mock)
      .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(0) }) // total = 0
      .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(1) }); // per-user = 1 (limit)

    await expect(service.applyPromocode(ORDER_ID, USER_ID, 'SUMMER20')).rejects.toThrow(
      BadRequestException,
    );
  });
});
