import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Promocode } from '../schemas/promocode.schema';

export class PromocodeResponseDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c11' })
  @Expose()
  @Transform(({ obj }: { obj: Promocode }) => obj._id?.toString())
  id!: string;

  @ApiProperty({ example: 'SUMMER20' })
  @Expose()
  code!: string;

  @ApiProperty({ example: 20 })
  @Expose()
  discountPercent!: number;

  @ApiPropertyOptional({ example: 100 })
  @Expose()
  maxUsages?: number;

  @ApiPropertyOptional({ example: 1 })
  @Expose()
  maxUsagesPerUser?: number;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @Expose()
  dateFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @Expose()
  dateTo?: Date;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: '2026-05-02T13:00:00.000Z' })
  @Expose()
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-02T13:30:00.000Z' })
  @Expose()
  updatedAt?: Date;

  constructor(partial: Partial<Promocode>) {
    Object.assign(this, partial);
  }
}
