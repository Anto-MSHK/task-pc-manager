import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../schemas/order.schema';

export class OrderResponseDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c12' })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj._id?.toString())
  id!: string;

  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c10' })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj.userId?.toString())
  userId!: string;

  @ApiPropertyOptional({ example: '662f0f2bb4f2a33d2f508c11' })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => obj.promocodeId?.toString())
  promocodeId?: string;

  @ApiProperty({ example: 1000 })
  @Expose()
  amount!: number;

  @ApiProperty({ example: 200 })
  @Expose()
  discountAmount!: number;

  @ApiProperty({ example: 800 })
  @Expose()
  finalAmount!: number;

  @ApiPropertyOptional({ example: '2026-05-02T13:00:00.000Z' })
  @Expose()
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-02T13:30:00.000Z' })
  @Expose()
  updatedAt?: Date;

  constructor(partial: Partial<Order>) {
    Object.assign(this, partial);
  }
}
