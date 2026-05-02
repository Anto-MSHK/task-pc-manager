import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'sync_failures', timestamps: true })
export class SyncFailure extends Document {
  @Prop({ required: true, index: true })
  outboxEventId!: string;

  @Prop({ required: true, index: true })
  aggregateType!: string;

  @Prop({ required: true, index: true })
  aggregateId!: string;

  @Prop({ required: true, type: Object })
  payload!: Record<string, unknown>;

  @Prop({ required: true })
  error!: string;

  @Prop({ default: false, index: true })
  isResolved!: boolean;

  @Prop()
  resolvedAt?: Date;

  createdAt!: Date;

  updatedAt!: Date;
}

export const SyncFailureSchema = SchemaFactory.createForClass(SyncFailure);
