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
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  current?: number = 1;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['ascend', 'descend'])
  sortOrder?: SortOrder;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateTo?: Date;
}

export class UsersAnalyticsQueryDto extends AnalyticsQueryDto {
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

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  minOrders?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  maxOrders?: number;
}

export class PromocodesAnalyticsQueryDto extends AnalyticsQueryDto {
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

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  minUsageCount?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  maxUsageCount?: number;
}

export class AnalyticsSummaryQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? new Date(value) : undefined,
  )
  @IsDate()
  dateTo?: Date;
}

export class PromoUsagesAnalyticsQueryDto extends AnalyticsQueryDto {
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

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  minDiscountAmount?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;
}
