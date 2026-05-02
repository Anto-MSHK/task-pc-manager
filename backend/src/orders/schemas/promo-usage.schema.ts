import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PromoUsage extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Promocode', index: true })
  promocodeId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order', unique: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  discountAmount!: number;

  @Prop({ required: true })
  usedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);

PromoUsageSchema.index({ promocodeId: 1, userId: 1 });
