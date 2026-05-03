import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { PromocodesModule } from '../promocodes/promocodes.module';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Promocode, PromocodeSchema } from '../promocodes/schemas/promocode.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PromoUsage, PromoUsageSchema } from '../orders/schemas/promo-usage.schema';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Promocode.name, schema: PromocodeSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
    UsersModule,
    PromocodesModule,
    OrdersModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
