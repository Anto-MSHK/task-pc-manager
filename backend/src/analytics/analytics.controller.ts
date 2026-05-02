import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsSummaryQueryDto,
  PromoUsagesAnalyticsQueryDto,
  PromocodesAnalyticsQueryDto,
  UsersAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import {
  AnalyticsPage,
  AnalyticsSummary,
  PromoUsageAnalyticsRow,
  PromocodesAnalyticsRow,
  UsersAnalyticsRow,
} from './analytics.types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async summary(@Query() query: AnalyticsSummaryQueryDto): Promise<AnalyticsSummary> {
    return this.analyticsService.getSummary(query);
  }

  @Get('users')
  async users(@Query() query: UsersAnalyticsQueryDto): Promise<AnalyticsPage<UsersAnalyticsRow>> {
    return this.analyticsService.getUsers(query);
  }

  @Get('promocodes')
  async promocodes(
    @Query() query: PromocodesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromocodesAnalyticsRow>> {
    return this.analyticsService.getPromocodes(query);
  }

  @Get('promo-usages')
  async promoUsages(
    @Query() query: PromoUsagesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromoUsageAnalyticsRow>> {
    return this.analyticsService.getPromoUsages(query);
  }
}
