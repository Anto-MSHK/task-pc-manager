import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Promocode extends Document {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code!: string;

  @Prop({ required: true, min: 1, max: 100 })
  discountPercent!: number;

  @Prop()
  maxUsages?: number;

  @Prop()
  maxUsagesPerUser?: number;

  @Prop()
  dateFrom?: Date;

  @Prop()
  dateTo?: Date;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromocodeSchema = SchemaFactory.createForClass(Promocode);
