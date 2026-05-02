import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxModule } from '../outbox/outbox.module';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';
import { Promocode, PromocodeSchema } from './schemas/promocode.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Promocode.name, schema: PromocodeSchema }]),
    OutboxModule,
  ],
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService],
})
export class PromocodesModule {}
