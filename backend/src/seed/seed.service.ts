import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../users/schemas/user.schema';
import { Promocode } from '../promocodes/schemas/promocode.schema';
import { Order } from '../orders/schemas/order.schema';
import { PromoUsage } from '../orders/schemas/promo-usage.schema';
import { UsersService } from '../users/users.service';
import { PromocodesService } from '../promocodes/promocodes.service';
import { OrdersService } from '../orders/orders.service';

const SEED_PASSWORD = 'password123';

interface SeedUserSpec {
  email: string;
  name: string;
  phone: string;
  isActive?: boolean;
}

interface SeedPromocodeSpec {
  code: string;
  discountPercent: number;
  maxUsages?: number;
  maxUsagesPerUser?: number;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

const SEED_USERS: SeedUserSpec[] = [
  { email: 'admin@promo.test', name: 'Alice Admin', phone: '+1-202-555-0101' },
  { email: 'bob@promo.test', name: 'Bob Builder', phone: '+1-202-555-0102' },
  { email: 'carol@promo.test', name: 'Carol Carter', phone: '+1-202-555-0103' },
  { email: 'dan@promo.test', name: 'Dan Dawson', phone: '+1-202-555-0104' },
  { email: 'erin@promo.test', name: 'Erin Edwards', phone: '+1-202-555-0105' },
  { email: 'frank@promo.test', name: 'Frank Foster', phone: '+1-202-555-0106' },
  { email: 'grace@promo.test', name: 'Grace Garcia', phone: '+1-202-555-0107' },
  { email: 'henry@promo.test', name: 'Henry Hughes', phone: '+1-202-555-0108' },
  { email: 'ivy@promo.test', name: 'Ivy Iverson', phone: '+1-202-555-0109' },
  {
    email: 'jack@promo.test',
    name: 'Jack Johnson (inactive)',
    phone: '+1-202-555-0110',
    isActive: false,
  },
];

function buildSeedPromocodes(): SeedPromocodeSpec[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      code: 'WELCOME10',
      discountPercent: 10,
      maxUsages: 100,
      maxUsagesPerUser: 1,
      dateFrom: new Date(now - 7 * day),
      dateTo: new Date(now + 30 * day),
    },
    {
      code: 'SUMMER20',
      discountPercent: 20,
      maxUsages: 50,
      maxUsagesPerUser: 2,
      dateFrom: new Date(now - 3 * day),
      dateTo: new Date(now + 60 * day),
    },
    {
      code: 'BLACKFRIDAY30',
      discountPercent: 30,
      maxUsages: 200,
      maxUsagesPerUser: 1,
      dateFrom: new Date(now - 14 * day),
      dateTo: new Date(now + 7 * day),
    },
    {
      code: 'VIP50',
      discountPercent: 50,
      maxUsages: 10,
      maxUsagesPerUser: 1,
      dateFrom: new Date(now - 30 * day),
      dateTo: new Date(now + 90 * day),
    },
    {
      code: 'EXPIRED5',
      discountPercent: 5,
      maxUsages: 100,
      maxUsagesPerUser: 5,
      dateFrom: new Date(now - 60 * day),
      dateTo: new Date(now - 30 * day),
      isActive: false,
    },
  ];
}

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Promocode.name) private readonly promocodeModel: Model<Promocode>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(PromoUsage.name) private readonly promoUsageModel: Model<PromoUsage>,
    private readonly usersService: UsersService,
    private readonly promocodesService: PromocodesService,
    private readonly ordersService: OrdersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('SEED_DEMO_DATA') === 'false') {
      return;
    }

    const [usersCount, promocodesCount, ordersCount, usagesCount] = await Promise.all([
      this.userModel.countDocuments(),
      this.promocodeModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.promoUsageModel.countDocuments(),
    ]);

    if (usersCount > 0 || promocodesCount > 0 || ordersCount > 0 || usagesCount > 0) {
      this.logger.log(
        `Seed skipped: existing data found (users=${usersCount}, promocodes=${promocodesCount}, orders=${ordersCount}, usages=${usagesCount})`,
      );
      return;
    }

    this.logger.log('Seeding demo data...');
    await this.seedUsers();
    const users = await this.userModel.find().exec();
    const promocodes = await this.seedPromocodes();
    const orders = await this.seedOrders(users);
    const usages = await this.seedPromoUsages(users, promocodes, orders);

    this.logger.log(
      `Seed complete: ${users.length} users, ${promocodes.length} promocodes, ${orders.length} orders, ${usages} promo usages.`,
    );
  }

  private async seedUsers(): Promise<void> {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, await bcrypt.genSalt());

    for (const spec of SEED_USERS) {
      const user = await this.usersService.create({
        email: spec.email,
        name: spec.name,
        phone: spec.phone,
        passwordHash,
      });

      if (spec.isActive === false) {
        await this.usersService.deactivate(user._id.toString());
      }
    }
  }

  private async seedPromocodes(): Promise<Promocode[]> {
    const created: Promocode[] = [];

    for (const spec of buildSeedPromocodes()) {
      await this.promocodesService.create({
        code: spec.code,
        discountPercent: spec.discountPercent,
        maxUsages: spec.maxUsages,
        maxUsagesPerUser: spec.maxUsagesPerUser,
        dateFrom: spec.dateFrom,
        dateTo: spec.dateTo,
      });

      const promo = await this.promocodeModel.findOne({ code: spec.code }).exec();
      if (!promo) {
        throw new Error(`Failed to load just-created promocode ${spec.code}`);
      }

      if (spec.isActive === false) {
        await this.promocodesService.deactivate(promo._id.toString());
      }
      created.push(promo);
    }

    return created;
  }

  private async seedOrders(users: User[]): Promise<Order[]> {
    const activeUsers = users.filter((user) => user.isActive);
    const created: Order[] = [];
    const baseAmounts = [49.9, 79, 120, 199.99, 250, 320.5, 480, 999, 1500, 2750];

    for (let index = 0; index < 30; index += 1) {
      const user = activeUsers[index % activeUsers.length];
      const amount = baseAmounts[index % baseAmounts.length] + index;
      await this.ordersService.create(user._id.toString(), { amount });
    }

    const orders = await this.orderModel.find().sort({ createdAt: 1 }).exec();
    created.push(...orders);

    return created;
  }

  private async seedPromoUsages(
    users: User[],
    promocodes: Promocode[],
    orders: Order[],
  ): Promise<number> {
    const activeUsers = users.filter((user) => user.isActive);
    const eligiblePromos = promocodes.filter(
      (promo) => promo.isActive && (!promo.dateTo || promo.dateTo > new Date()),
    );

    if (eligiblePromos.length === 0 || activeUsers.length === 0) {
      return 0;
    }

    let success = 0;
    let promoIndex = 0;

    for (const order of orders) {
      if (success >= 15) {
        break;
      }

      const promo = eligiblePromos[promoIndex % eligiblePromos.length];
      promoIndex += 1;

      try {
        await this.ordersService.applyPromocode(
          order._id.toString(),
          order.userId.toString(),
          promo.code,
        );
        success += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Skipping promo usage for order ${order._id.toString()} / promo ${promo.code}: ${message}`,
        );
      }
    }

    return success;
  }
}
