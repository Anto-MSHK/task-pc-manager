import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { OutboxService } from './outbox.service';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';
import { SyncFailure, SyncFailureSchema } from './schemas/sync-failure.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
      { name: SyncFailure.name, schema: SyncFailureSchema },
    ]),
    ClickhouseModule,
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
