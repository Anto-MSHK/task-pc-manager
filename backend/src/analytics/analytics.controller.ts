import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import {
  AnalyticsSummaryDto,
  PromoUsagesAnalyticsPageDto,
  PromocodesAnalyticsPageDto,
  UsersAnalyticsPageDto,
} from './dto/analytics-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get KPI summary from ClickHouse' })
  @ApiOkResponse({
    description: 'Analytics summary returned successfully',
    type: AnalyticsSummaryDto,
  })
  async summary(@Query() query: AnalyticsSummaryQueryDto): Promise<AnalyticsSummary> {
    return this.analyticsService.getSummary(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user analytics from ClickHouse' })
  @ApiOkResponse({
    description: 'User analytics returned successfully',
    type: UsersAnalyticsPageDto,
  })
  async users(@Query() query: UsersAnalyticsQueryDto): Promise<AnalyticsPage<UsersAnalyticsRow>> {
    return this.analyticsService.getUsers(query);
  }

  @Get('promocodes')
  @ApiOperation({ summary: 'Get promocode analytics from ClickHouse' })
  @ApiOkResponse({
    description: 'Promocode analytics returned successfully',
    type: PromocodesAnalyticsPageDto,
  })
  async promocodes(
    @Query() query: PromocodesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromocodesAnalyticsRow>> {
    return this.analyticsService.getPromocodes(query);
  }

  @Get('promo-usages')
  @ApiOperation({ summary: 'Get promocode usage analytics from ClickHouse' })
  @ApiOkResponse({
    description: 'Promocode usage analytics returned successfully',
    type: PromoUsagesAnalyticsPageDto,
  })
  async promoUsages(
    @Query() query: PromoUsagesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromoUsageAnalyticsRow>> {
    return this.analyticsService.getPromoUsages(query);
  }
}
