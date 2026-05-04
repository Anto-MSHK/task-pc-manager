import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSeriesPointDto {
  @ApiProperty({ example: '2026-05-01' })
  date!: string;

  @ApiProperty({ example: 12 })
  orders!: number;

  @ApiProperty({ example: 15800.5 })
  revenue!: number;

  @ApiProperty({ example: 7 })
  promoUsages!: number;

  @ApiProperty({ example: 920 })
  discount!: number;
}

export class DashboardSeriesResponseDto {
  @ApiProperty({ type: () => [DashboardSeriesPointDto] })
  series!: DashboardSeriesPointDto[];
}

export class AnalyticsSummaryDto {
  @ApiProperty({ example: 8 })
  activeUsers!: number;

  @ApiProperty({ example: 10 })
  totalUsers!: number;

  @ApiProperty({ example: 30 })
  totalOrders!: number;

  @ApiProperty({ example: 15 })
  ordersWithPromo!: number;

  @ApiProperty({ example: 125000.5 })
  totalRevenue!: number;

  @ApiProperty({ example: 4500 })
  totalDiscount!: number;

  @ApiProperty({ example: 15 })
  promoUsages!: number;

  @ApiProperty({ example: 4 })
  activePromocodes!: number;
}

export class UsersAnalyticsRowDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c10' })
  id!: string;

  @ApiProperty({ example: 'anna@example.com' })
  email!: string;

  @ApiProperty({ example: 'Anna Ivanova' })
  name!: string;

  @ApiPropertyOptional({ example: '+79991234567', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 3 })
  ordersCount!: number;

  @ApiProperty({ example: 2 })
  ordersWithPromocode!: number;

  @ApiProperty({ example: 2 })
  promoUsagesCount!: number;

  @ApiProperty({ example: 5400 })
  totalSpent!: number;

  @ApiProperty({ example: 4800 })
  totalFinalAmount!: number;

  @ApiProperty({ example: 600 })
  totalDiscount!: number;

  @ApiPropertyOptional({ example: '2026-05-02T13:00:00.000Z', nullable: true })
  lastOrderAt!: string | null;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-02T10:00:00.000Z' })
  updatedAt!: string;
}

export class PromocodesAnalyticsRowDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c11' })
  id!: string;

  @ApiProperty({ example: 'SUMMER20' })
  code!: string;

  @ApiProperty({ example: 20 })
  discountPercent!: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxUsages!: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  maxUsagesPerUser!: number | null;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z', nullable: true })
  dateFrom!: string | null;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z', nullable: true })
  dateTo!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 15 })
  usageCount!: number;

  @ApiProperty({ example: 9 })
  uniqueUsers!: number;

  @ApiProperty({ example: 4500 })
  totalDiscount!: number;

  @ApiProperty({ example: 28000 })
  totalRevenue!: number;

  @ApiPropertyOptional({ example: '2026-05-02T13:00:00.000Z', nullable: true })
  lastUsedAt!: string | null;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-02T10:00:00.000Z' })
  updatedAt!: string;
}

export class PromoUsageAnalyticsRowDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c13' })
  id!: string;

  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c11' })
  promocodeId!: string;

  @ApiProperty({ example: 'SUMMER20' })
  promocodeCode!: string;

  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c10' })
  userId!: string;

  @ApiProperty({ example: 'Anna Ivanova' })
  userName!: string;

  @ApiProperty({ example: 'anna@example.com' })
  userEmail!: string;

  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c12' })
  orderId!: string;

  @ApiPropertyOptional({ example: 1000, nullable: true })
  orderAmount!: number | null;

  @ApiPropertyOptional({ example: 800, nullable: true })
  orderFinalAmount!: number | null;

  @ApiProperty({ example: 200 })
  discountAmount!: number;

  @ApiProperty({ example: '2026-05-02T13:00:00.000Z' })
  usedAt!: string;

  @ApiProperty({ example: '2026-05-02T13:00:00.000Z' })
  createdAt!: string;
}

class AnalyticsPageBaseDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  current!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}

export class UsersAnalyticsPageDto extends AnalyticsPageBaseDto {
  @ApiProperty({ type: () => [UsersAnalyticsRowDto] })
  data!: UsersAnalyticsRowDto[];
}

export class PromocodesAnalyticsPageDto extends AnalyticsPageBaseDto {
  @ApiProperty({ type: () => [PromocodesAnalyticsRowDto] })
  data!: PromocodesAnalyticsRowDto[];
}

export class PromoUsagesAnalyticsPageDto extends AnalyticsPageBaseDto {
  @ApiProperty({ type: () => [PromoUsageAnalyticsRowDto] })
  data!: PromoUsageAnalyticsRowDto[];
}
