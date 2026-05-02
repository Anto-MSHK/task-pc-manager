/**
 * Race-condition integration test for apply-promocode.
 *
 * Requires running services: MongoDB replica set + Redis.
 * Skip with:  SKIP_INTEGRATION=true npm test
 * Run with:   docker compose up -d mongodb redis && npm test
 *
 * Scenario:
 *   - promocode with maxUsages=1
 *   - 10 concurrent apply-promocode calls
 *   - exactly 1 must succeed, 9 must fail with 400/409/ConflictException
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from '../src/orders/orders.service';
import { OrdersModule } from '../src/orders/orders.module';
import { UsersModule } from '../src/users/users.module';
import { PromocodesModule } from '../src/promocodes/promocodes.module';
import { RedisModule } from '../src/redis/redis.module';
import { OutboxModule } from '../src/outbox/outbox.module';
import { ClickhouseModule } from '../src/clickhouse/clickhouse.module';
import { DatabaseModule } from '../src/database/database.module';
import { UsersService } from '../src/users/users.service';
import { PromocodesService } from '../src/promocodes/promocodes.service';
import { Order } from '../src/orders/schemas/order.schema';
import { PromoUsage } from '../src/orders/schemas/promo-usage.schema';
import { validateEnv } from '../src/config/env.validation';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

(SKIP ? describe.skip : describe)('apply-promocode race condition (integration)', () => {
  let module: TestingModule;
  let ordersService: OrdersService;
  let usersService: UsersService;
  let promocodesService: PromocodesService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        RedisModule,
        ClickhouseModule,
        OutboxModule,
        UsersModule,
        PromocodesModule,
        OrdersModule,
      ],
    }).compile();

    await module.init();
    ordersService = module.get(OrdersService);
    usersService = module.get(UsersService);
    promocodesService = module.get(PromocodesService);
  }, 30_000);

  afterAll(async () => {
    await module.close();
  });

  it('only 1 of 10 concurrent apply-promocode succeeds when maxUsages=1', async () => {
    // Seed: 1 user, 1 promocode (maxUsages=1), 10 orders
    const user = await usersService.create({
      email: `race-${Date.now()}@test.com`,
      name: 'Race User',
      passwordHash: 'hash',
    });
    const userId = user._id.toString();

    const promo = await promocodesService.create({
      code: `RACE${Date.now()}`,
      discountPercent: 10,
      maxUsages: 1,
    });

    const orderModel = module.get(getModelToken(Order.name));
    const orders = await Promise.all(
      Array.from({ length: 10 }, () =>
        orderModel.create({ userId: new Types.ObjectId(userId), amount: 100, discountAmount: 0, finalAmount: 100 }),
      ),
    );

    // 10 concurrent apply calls
    const results = await Promise.allSettled(
      orders.map((order: { _id: { toString(): string } }) =>
        ordersService.applyPromocode(order._id.toString(), userId, promo.code),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);

    // Every failure must be a known business error (not a 500)
    for (const failure of failures) {
      const err = (failure as PromiseRejectedResult).reason as Error;
      const isKnownError =
        err instanceof ConflictException ||
        err instanceof BadRequestException ||
        err instanceof NotFoundException;
      expect(isKnownError).toBe(true);
    }

    // Exactly 1 promo_usage in DB
    const promoUsageModel = module.get(getModelToken(PromoUsage.name));
    const usageCount = await promoUsageModel.countDocuments({ promocodeId: promo.id });
    expect(usageCount).toBe(1);
  }, 15_000);
});
