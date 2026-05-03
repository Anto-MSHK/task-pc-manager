import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortOrder = 'ascend' | 'descend';

const toNumber = ({ value }: { value: unknown }): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
};

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return undefined;
};

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  current?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: ['ascend', 'descend'], example: 'descend' })
  @IsOptional()
  @IsIn(['ascend', 'descend'])
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: 'anna' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateTo?: Date;
}

export class UsersAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'name',
      'email',
      'isActive',
      'ordersCount',
      'promoUsagesCount',
      'totalSpent',
      'totalDiscount',
      'lastOrderAt',
      'createdAt',
    ],
    example: 'totalSpent',
    default: 'totalSpent',
  })
  @IsOptional()
  @IsIn([
    'name',
    'email',
    'isActive',
    'ordersCount',
    'promoUsagesCount',
    'totalSpent',
    'totalDiscount',
    'lastOrderAt',
    'createdAt',
  ])
  sortField?: string = 'totalSpent';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  minOrders?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  maxOrders?: number;
}

export class PromocodesAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'code',
      'discountPercent',
      'isActive',
      'usageCount',
      'uniqueUsers',
      'totalDiscount',
      'totalRevenue',
      'lastUsedAt',
      'createdAt',
    ],
    example: 'usageCount',
    default: 'usageCount',
  })
  @IsOptional()
  @IsIn([
    'code',
    'discountPercent',
    'isActive',
    'usageCount',
    'uniqueUsers',
    'totalDiscount',
    'totalRevenue',
    'lastUsedAt',
    'createdAt',
  ])
  sortField?: string = 'usageCount';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  minUsageCount?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  maxUsageCount?: number;
}

export class AnalyticsSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateTo?: Date;
}

export class PromoUsagesAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'promocodeCode',
      'userName',
      'userEmail',
      'orderId',
      'discountAmount',
      'usedAt',
      'createdAt',
    ],
    example: 'usedAt',
    default: 'usedAt',
  })
  @IsOptional()
  @IsIn([
    'promocodeCode',
    'userName',
    'userEmail',
    'orderId',
    'discountAmount',
    'usedAt',
    'createdAt',
  ])
  sortField?: string = 'usedAt';

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  minDiscountAmount?: number;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;
}
