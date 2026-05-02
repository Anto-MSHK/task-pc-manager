import { Expose, Transform } from 'class-transformer';
import { Promocode } from '../schemas/promocode.schema';

export class PromocodeResponseDto {
  @Expose()
  @Transform(({ obj }: { obj: Promocode }) => obj._id?.toString())
  id!: string;

  @Expose()
  code!: string;

  @Expose()
  discountPercent!: number;

  @Expose()
  maxUsages?: number;

  @Expose()
  maxUsagesPerUser?: number;

  @Expose()
  dateFrom?: Date;

  @Expose()
  dateTo?: Date;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  constructor(partial: Partial<Promocode>) {
    Object.assign(this, partial);
  }
}
