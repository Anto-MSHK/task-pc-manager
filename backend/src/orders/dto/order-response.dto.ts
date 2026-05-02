import { Expose, Transform } from 'class-transformer';
import { Order } from '../schemas/order.schema';

export class OrderResponseDto {
  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj._id?.toString())
  id!: string;

  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj.userId?.toString())
  userId!: string;

  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj.promocodeId?.toString())
  promocodeId?: string;

  @Expose()
  amount!: number;

  @Expose()
  discountAmount!: number;

  @Expose()
  finalAmount!: number;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  constructor(partial: Partial<Order>) {
    Object.assign(this, partial);
  }
}
