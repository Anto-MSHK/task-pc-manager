import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { ClickhouseModule } from './clickhouse/clickhouse.module';
import { OutboxModule } from './outbox/outbox.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtGlobalModule } from './auth/jwt-global.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { validateEnv } from './config/env.validation';
import { PromocodesModule } from './promocodes/promocodes.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '..', '.env'), join(__dirname, '..', '.env')],
      validate: validateEnv,
    }),
    JwtGlobalModule,
    DatabaseModule,
    RedisModule,
    ClickhouseModule,
    OutboxModule,
    UsersModule,
    PromocodesModule,
    OrdersModule,
    AnalyticsModule,
    AuthModule,
    SeedModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
