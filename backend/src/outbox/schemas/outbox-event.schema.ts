import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const OUTBOX_EVENT_STATUS = ['pending', 'processing', 'done', 'failed'] as const;
export type OutboxEventStatus = (typeof OUTBOX_EVENT_STATUS)[number];

export const OUTBOX_EVENT_OPERATION = ['upsert', 'append'] as const;
export type OutboxEventOperation = (typeof OUTBOX_EVENT_OPERATION)[number];

@Schema({ collection: 'outbox_events', timestamps: true })
export class OutboxEvent extends Document {
  @Prop({ required: true })
  eventType!: string;

  @Prop({ required: true, index: true })
  aggregateType!: 'users' | 'promocodes' | 'orders' | 'promo_usages';

  @Prop({ required: true, index: true })
  aggregateId!: string;

  @Prop({ required: true, enum: OUTBOX_EVENT_OPERATION, default: 'upsert' })
  operation!: OutboxEventOperation;

  @Prop({ required: true, type: Object })
  payload!: Record<string, unknown>;

  @Prop({ required: true, enum: OUTBOX_EVENT_STATUS, default: 'pending', index: true })
  status!: OutboxEventStatus;

  @Prop({ required: true, default: 0 })
  attempts!: number;

  @Prop()
  nextRetryAt?: Date;

  @Prop()
  lockedAt?: Date;

  @Prop()
  lastError?: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxEventSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
