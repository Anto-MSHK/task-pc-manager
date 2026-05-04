import { Injectable } from '@nestjs/common';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { RedisService } from '../redis/redis.service';
import {
  AnalyticsQueryDto,
  AnalyticsSummaryQueryDto,
  PromoUsagesAnalyticsQueryDto,
  PromocodesAnalyticsQueryDto,
  UsersAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import {
  AnalyticsPage,
  AnalyticsSummary,
  CountRow,
  DashboardSeriesPoint,
  PromoUsageAnalyticsRow,
  PromocodesAnalyticsRow,
  UsersAnalyticsRow,
} from './analytics.types';

const CACHE_TTL_SECONDS = 30;

type QueryParams = Record<string, string | number | boolean>;
type RowValue = string | number | boolean | null;
type RawRow = Record<string, RowValue>;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly clickhouseService: ClickhouseService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Invalidate all cached analytics responses for a given namespace (or all).
   * Called on CRUD mutations so that users see fresh data without waiting 30s.
   */
  async invalidateCache(
    ...namespaces: Array<'users' | 'promocodes' | 'promo-usages' | 'summary' | 'series'>
  ): Promise<void> {
    const client = this.redisService.getClient();
    const targets =
      namespaces.length > 0
        ? namespaces
        : ['users', 'promocodes', 'promo-usages', 'summary', 'series'];

    await Promise.all(
      targets.map(async (ns) => {
        const pattern = `analytics:${ns}:*`;
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }),
    );
  }

  async getUsers(query: UsersAnalyticsQueryDto): Promise<AnalyticsPage<UsersAnalyticsRow>> {
    return this.withCache('users', query, async () => {
      const baseQuery = this.usersBaseQuery(query);
      const params = this.baseParams(query);
      const filters = this.buildFilters([
        query.search
          ? '(positionCaseInsensitive(email, {search:String}) > 0 OR positionCaseInsensitive(name, {search:String}) > 0)'
          : undefined,
        typeof query.isActive === 'boolean' ? 'isActive = {isActive:UInt8}' : undefined,
        typeof query.minOrders === 'number' ? 'ordersCount >= {minOrders:UInt32}' : undefined,
        typeof query.maxOrders === 'number' ? 'ordersCount <= {maxOrders:UInt32}' : undefined,
      ]);

      if (query.search) {
        params.search = query.search;
      }
      if (typeof query.isActive === 'boolean') {
        params.isActive = query.isActive ? 1 : 0;
      }
      if (typeof query.minOrders === 'number') {
        params.minOrders = query.minOrders;
      }
      if (typeof query.maxOrders === 'number') {
        params.maxOrders = query.maxOrders;
      }

      const page = this.page(query);
      const sortField = this.pickSortField(query.sortField, {
        name: 'name',
        email: 'email',
        isActive: 'isActive',
        ordersCount: 'ordersCount',
        promoUsagesCount: 'promoUsagesCount',
        totalSpent: 'totalSpent',
        totalDiscount: 'totalDiscount',
        lastOrderAt: 'lastOrderAt',
        createdAt: 'createdAt',
      });

      const rows = await this.readPage<UsersAnalyticsRow>(
        baseQuery,
        filters,
        params,
        page,
        sortField,
      );
      return rows;
    });
  }

  async getPromocodes(
    query: PromocodesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromocodesAnalyticsRow>> {
    return this.withCache('promocodes', query, async () => {
      const baseQuery = this.promocodesBaseQuery(query);
      const params = this.baseParams(query);
      const filters = this.buildFilters([
        query.search ? 'positionCaseInsensitive(code, {search:String}) > 0' : undefined,
        typeof query.isActive === 'boolean' ? 'isActive = {isActive:UInt8}' : undefined,
        typeof query.minUsageCount === 'number'
          ? 'usageCount >= {minUsageCount:UInt32}'
          : undefined,
        typeof query.maxUsageCount === 'number'
          ? 'usageCount <= {maxUsageCount:UInt32}'
          : undefined,
      ]);

      if (query.search) {
        params.search = query.search;
      }
      if (typeof query.isActive === 'boolean') {
        params.isActive = query.isActive ? 1 : 0;
      }
      if (typeof query.minUsageCount === 'number') {
        params.minUsageCount = query.minUsageCount;
      }
      if (typeof query.maxUsageCount === 'number') {
        params.maxUsageCount = query.maxUsageCount;
      }

      const page = this.page(query);
      const sortField = this.pickSortField(query.sortField, {
        code: 'code',
        discountPercent: 'discountPercent',
        isActive: 'isActive',
        usageCount: 'usageCount',
        uniqueUsers: 'uniqueUsers',
        totalDiscount: 'totalDiscount',
        totalRevenue: 'totalRevenue',
        lastUsedAt: 'lastUsedAt',
        createdAt: 'createdAt',
      });

      return this.readPage<PromocodesAnalyticsRow>(baseQuery, filters, params, page, sortField);
    });
  }

  async getPromoUsages(
    query: PromoUsagesAnalyticsQueryDto,
  ): Promise<AnalyticsPage<PromoUsageAnalyticsRow>> {
    return this.withCache('promo-usages', query, async () => {
      const baseQuery = this.promoUsagesBaseQuery(query);
      const params = this.baseParams(query);
      const filters = this.buildFilters([
        query.search
          ? `(positionCaseInsensitive(promocodeCode, {search:String}) > 0
              OR positionCaseInsensitive(userName, {search:String}) > 0
              OR positionCaseInsensitive(userEmail, {search:String}) > 0
              OR positionCaseInsensitive(orderId, {search:String}) > 0)`
          : undefined,
        typeof query.minDiscountAmount === 'number'
          ? 'discountAmount >= {minDiscountAmount:Decimal(12, 2)}'
          : undefined,
        typeof query.maxDiscountAmount === 'number'
          ? 'discountAmount <= {maxDiscountAmount:Decimal(12, 2)}'
          : undefined,
      ]);

      if (query.search) {
        params.search = query.search;
      }
      if (typeof query.minDiscountAmount === 'number') {
        params.minDiscountAmount = query.minDiscountAmount;
      }
      if (typeof query.maxDiscountAmount === 'number') {
        params.maxDiscountAmount = query.maxDiscountAmount;
      }

      const page = this.page(query);
      const sortField = this.pickSortField(query.sortField, {
        promocodeCode: 'promocodeCode',
        userName: 'userName',
        userEmail: 'userEmail',
        orderId: 'orderId',
        discountAmount: 'discountAmount',
        usedAt: 'usedAt',
        createdAt: 'createdAt',
      });

      return this.readPage<PromoUsageAnalyticsRow>(baseQuery, filters, params, page, sortField);
    });
  }

  async getSummary(query: AnalyticsSummaryQueryDto): Promise<AnalyticsSummary> {
    const key = `analytics:summary:${JSON.stringify(query)}`;
    const cached = await this.redisService.getClient().get(key);
    if (cached) {
      return JSON.parse(cached) as AnalyticsSummary;
    }

    const params: QueryParams = {};
    if (query.dateFrom) {
      params.dateFrom = query.dateFrom.toISOString();
    }
    if (query.dateTo) {
      params.dateTo = query.dateTo.toISOString();
    }

    const dateFilter = (column: string): string => {
      const parts: string[] = [];
      if (query.dateFrom) {
        parts.push(`${column} >= parseDateTimeBestEffort({dateFrom:String})`);
      }
      if (query.dateTo) {
        parts.push(`${column} <= parseDateTimeBestEffort({dateTo:String})`);
      }
      return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
    };

    type SummaryRow = {
      activeUsers: string | number;
      totalUsers: string | number;
      totalOrders: string | number;
      ordersWithPromo: string | number;
      totalRevenue: string | number;
      totalDiscount: string | number;
      promoUsages: string | number;
      activePromocodes: string | number;
    };

    const rows = await this.clickhouseService.queryRows<SummaryRow>(
      `
        WITH
          latest_users AS (
            SELECT id, argMax(isActive, updatedAt) AS isActive
            FROM users
            GROUP BY id
          ),
          latest_orders AS (
            SELECT
              id,
              argMax(promocodeId, updatedAt) AS promocodeId,
              argMax(finalAmount, updatedAt) AS finalAmount,
              min(createdAt) AS createdAt
            FROM orders
            GROUP BY id
          ),
          latest_promocodes AS (
            SELECT id, argMax(isActive, updatedAt) AS isActive
            FROM promocodes
            GROUP BY id
          ),
          user_stats AS (
            SELECT
              countIf(isActive = 1) AS activeUsers,
              count() AS totalUsers
            FROM latest_users
          ),
          order_stats AS (
            SELECT
              count() AS totalOrders,
              countIf(isNotNull(promocodeId)) AS ordersWithPromo,
              sum(finalAmount) AS totalRevenue
            FROM latest_orders
            ${dateFilter('createdAt')}
          ),
          usage_stats AS (
            SELECT
              count() AS promoUsages,
              sum(discountAmount) AS totalDiscount
            FROM promo_usages
            ${dateFilter('usedAt')}
          ),
          promo_stats AS (
            SELECT countIf(isActive = 1) AS activePromocodes
            FROM latest_promocodes
          )
        SELECT
          us.activeUsers,
          us.totalUsers,
          os.totalOrders,
          os.ordersWithPromo,
          os.totalRevenue,
          ug.totalDiscount,
          ug.promoUsages,
          ps.activePromocodes
        FROM user_stats us, order_stats os, usage_stats ug, promo_stats ps
      `,
      params,
    );

    const row = rows[0];
    const summary: AnalyticsSummary = {
      activeUsers: Number(row?.activeUsers ?? 0),
      totalUsers: Number(row?.totalUsers ?? 0),
      totalOrders: Number(row?.totalOrders ?? 0),
      ordersWithPromo: Number(row?.ordersWithPromo ?? 0),
      totalRevenue: Number(row?.totalRevenue ?? 0),
      totalDiscount: Number(row?.totalDiscount ?? 0),
      promoUsages: Number(row?.promoUsages ?? 0),
      activePromocodes: Number(row?.activePromocodes ?? 0),
    };

    await this.redisService.getClient().setex(key, CACHE_TTL_SECONDS, JSON.stringify(summary));
    return summary;
  }

  async getSeries(query: AnalyticsSummaryQueryDto): Promise<DashboardSeriesPoint[]> {
    const key = `analytics:series:${JSON.stringify(query)}`;
    const cached = await this.redisService.getClient().get(key);
    if (cached) {
      return JSON.parse(cached) as DashboardSeriesPoint[];
    }

    const params: QueryParams = {};
    if (query.dateFrom) {
      params.dateFrom = query.dateFrom.toISOString();
    }
    if (query.dateTo) {
      params.dateTo = query.dateTo.toISOString();
    }

    const ordersDateFilter = this.buildSeriesDateFilter(query, 'createdAt');
    const usagesDateFilter = this.buildSeriesDateFilter(query, 'usedAt');

    type SeriesAggRow = {
      day: string;
      orders: string | number;
      revenue: string | number;
      promoUsages: string | number;
      discount: string | number;
    };

    const rows = await this.clickhouseService.queryRows<SeriesAggRow>(
      `
        WITH latest_orders AS (
          SELECT
            id,
            argMax(finalAmount, updatedAt) AS finalAmount,
            argMax(promocodeId, updatedAt) AS promocodeId,
            min(createdAt) AS createdAt
          FROM orders
          GROUP BY id
        )
        SELECT
          formatDateTime(series_inner.day, '%Y-%m-%d') AS day,
          sum(series_inner.orders_cnt) AS orders,
          sum(series_inner.revenue_sum) AS revenue,
          sum(series_inner.promo_cnt) AS promoUsages,
          sum(series_inner.discount_sum) AS discount
        FROM (
          SELECT
            toDate(createdAt) AS day,
            toUInt64(count()) AS orders_cnt,
            ifNull(toFloat64(sum(finalAmount)), 0) AS revenue_sum,
            toUInt64(0) AS promo_cnt,
            toFloat64(0) AS discount_sum
          FROM latest_orders
          ${ordersDateFilter}
          GROUP BY day
          UNION ALL
          SELECT
            toDate(usedAt) AS day,
            toUInt64(0),
            toFloat64(0),
            toUInt64(count()),
            ifNull(toFloat64(sum(discountAmount)), 0)
          FROM promo_usages
          ${usagesDateFilter}
          GROUP BY day
        ) AS series_inner
        GROUP BY series_inner.day
        ORDER BY series_inner.day
      `,
      params,
    );

    const series: DashboardSeriesPoint[] = rows.map((row) => ({
      date: String(row.day),
      orders: Number(row.orders ?? 0),
      revenue: Number(row.revenue ?? 0),
      promoUsages: Number(row.promoUsages ?? 0),
      discount: Number(row.discount ?? 0),
    }));

    await this.redisService.getClient().setex(key, CACHE_TTL_SECONDS, JSON.stringify(series));
    return series;
  }

  private buildSeriesDateFilter(query: AnalyticsSummaryQueryDto, column: string): string {
    const parts: string[] = [];
    if (query.dateFrom) {
      parts.push(`${column} >= parseDateTimeBestEffort({dateFrom:String})`);
    }
    if (query.dateTo) {
      parts.push(`${column} <= parseDateTimeBestEffort({dateTo:String})`);
    }
    return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
  }

  private async readPage<T extends object>(
    baseQuery: string,
    filters: string,
    params: QueryParams,
    page: { current: number; pageSize: number; offset: number; sortDirection: 'ASC' | 'DESC' },
    sortField: string,
  ): Promise<AnalyticsPage<T>> {
    const [data, countRows] = await Promise.all([
      this.clickhouseService.queryRows<RawRow>(
        `
          SELECT *
          FROM (${baseQuery})
          ${filters}
          ORDER BY ${sortField} ${page.sortDirection}
          LIMIT {limit:UInt32}
          OFFSET {offset:UInt32}
        `,
        { ...params, limit: page.pageSize, offset: page.offset },
      ),
      this.clickhouseService.queryRows<CountRow>(
        `
          SELECT count() AS total
          FROM (
            SELECT *
            FROM (${baseQuery}) AS inner_data
            ${filters}
          )
        `,
        params,
      ),
    ]);

    return {
      data: data.map((row) => this.normalizeRow<T>(row)),
      total: Number(countRows[0]?.total ?? 0),
      current: page.current,
      pageSize: page.pageSize,
    };
  }

  private usersBaseQuery(query: AnalyticsQueryDto): string {
    return `
      WITH
        latest_users AS (
          SELECT
            id,
            argMax(email, updatedAt) AS email,
            argMax(name, updatedAt) AS name,
            argMax(phone, updatedAt) AS phone,
            argMax(isActive, updatedAt) AS isActive,
            min(createdAt) AS createdAt,
            max(updatedAt) AS latestUpdatedAt
          FROM users
          GROUP BY id
        ),
        latest_orders AS (
          SELECT
            id,
            argMax(userId, updatedAt) AS userId,
            argMax(promocodeId, updatedAt) AS promocodeId,
            argMax(amount, updatedAt) AS amount,
            argMax(discountAmount, updatedAt) AS discountAmount,
            argMax(finalAmount, updatedAt) AS finalAmount,
            min(createdAt) AS createdAt
          FROM orders
          GROUP BY id
        ),
        order_agg AS (
          SELECT
            userId,
            count() AS ordersCount,
            countIf(isNotNull(promocodeId)) AS ordersWithPromocode,
            sum(amount) AS totalSpent,
            sum(finalAmount) AS totalFinalAmount,
            max(createdAt) AS lastOrderAt
          FROM latest_orders
          ${this.dateWhere(query, 'createdAt')}
          GROUP BY userId
        ),
        usage_agg AS (
          SELECT
            userId,
            count() AS promoUsagesCount,
            sum(discountAmount) AS totalDiscount
          FROM promo_usages
          ${this.dateWhere(query, 'usedAt')}
          GROUP BY userId
        )
      SELECT
        u.id,
        u.email,
        u.name,
        u.phone,
        u.isActive,
        ifNull(oa.ordersCount, 0) AS ordersCount,
        ifNull(oa.ordersWithPromocode, 0) AS ordersWithPromocode,
        ifNull(ua.promoUsagesCount, 0) AS promoUsagesCount,
        ifNull(oa.totalSpent, 0) AS totalSpent,
        ifNull(oa.totalFinalAmount, 0) AS totalFinalAmount,
        ifNull(ua.totalDiscount, 0) AS totalDiscount,
        oa.lastOrderAt AS lastOrderAt,
        u.createdAt,
        u.latestUpdatedAt AS updatedAt
      FROM latest_users u
      LEFT JOIN order_agg oa ON oa.userId = u.id
      LEFT JOIN usage_agg ua ON ua.userId = u.id
    `;
  }

  private promocodesBaseQuery(query: AnalyticsQueryDto): string {
    return `
      WITH
        latest_promocodes AS (
          SELECT
            id,
            argMax(code, updatedAt) AS code,
            argMax(discountPercent, updatedAt) AS discountPercent,
            argMax(maxUsages, updatedAt) AS maxUsages,
            argMax(maxUsagesPerUser, updatedAt) AS maxUsagesPerUser,
            argMax(dateFrom, updatedAt) AS dateFrom,
            argMax(dateTo, updatedAt) AS dateTo,
            argMax(isActive, updatedAt) AS isActive,
            min(createdAt) AS createdAt,
            max(updatedAt) AS latestUpdatedAt
          FROM promocodes
          GROUP BY id
        ),
        usage_agg AS (
          SELECT
            promocodeId,
            count() AS usageCount,
            uniqExact(userId) AS uniqueUsers,
            sum(discountAmount) AS totalDiscount,
            max(usedAt) AS lastUsedAt
          FROM promo_usages
          ${this.dateWhere(query, 'usedAt')}
          GROUP BY promocodeId
        ),
        latest_orders AS (
          SELECT
            id,
            argMax(promocodeId, updatedAt) AS promocodeId,
            argMax(finalAmount, updatedAt) AS finalAmount,
            min(createdAt) AS createdAt
          FROM orders
          GROUP BY id
        ),
        order_agg AS (
          SELECT
            promocodeId,
            sum(finalAmount) AS totalRevenue
          FROM latest_orders
          WHERE isNotNull(promocodeId)
          ${this.dateAnd(query, 'createdAt')}
          GROUP BY promocodeId
        )
      SELECT
        p.id,
        p.code,
        p.discountPercent,
        p.maxUsages,
        p.maxUsagesPerUser,
        p.dateFrom,
        p.dateTo,
        p.isActive,
        ifNull(ua.usageCount, 0) AS usageCount,
        ifNull(ua.uniqueUsers, 0) AS uniqueUsers,
        ifNull(ua.totalDiscount, 0) AS totalDiscount,
        ifNull(oa.totalRevenue, 0) AS totalRevenue,
        ua.lastUsedAt AS lastUsedAt,
        p.createdAt,
        p.latestUpdatedAt AS updatedAt
      FROM latest_promocodes p
      LEFT JOIN usage_agg ua ON ua.promocodeId = p.id
      LEFT JOIN order_agg oa ON oa.promocodeId = p.id
    `;
  }

  private promoUsagesBaseQuery(query: AnalyticsQueryDto): string {
    return `
      WITH latest_orders AS (
        SELECT
          id,
          argMax(amount, updatedAt) AS orderAmount,
          argMax(finalAmount, updatedAt) AS orderFinalAmount
        FROM orders
        GROUP BY id
      )
      SELECT
        pu.id,
        pu.promocodeId,
        pu.promocodeCode,
        pu.userId,
        pu.userName,
        pu.userEmail,
        pu.orderId,
        o.orderAmount,
        o.orderFinalAmount,
        pu.discountAmount,
        pu.usedAt,
        pu.createdAt
      FROM promo_usages pu
      LEFT JOIN latest_orders o ON o.id = pu.orderId
      ${this.dateWhere(query, 'pu.usedAt')}
    `;
  }

  private buildFilters(filters: Array<string | undefined>): string {
    const activeFilters = filters.filter((filter): filter is string => Boolean(filter));
    return activeFilters.length > 0 ? `WHERE ${activeFilters.join(' AND ')}` : '';
  }

  private dateWhere(query: AnalyticsQueryDto, column: string): string {
    const conditions = this.dateConditions(query, column);
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private dateAnd(query: AnalyticsQueryDto, column: string): string {
    const conditions = this.dateConditions(query, column);
    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }

  private dateConditions(query: AnalyticsQueryDto, column: string): string[] {
    const conditions: string[] = [];
    if (query.dateFrom) {
      conditions.push(`${column} >= parseDateTimeBestEffort({dateFrom:String})`);
    }
    if (query.dateTo) {
      conditions.push(`${column} <= parseDateTimeBestEffort({dateTo:String})`);
    }
    return conditions;
  }

  private baseParams(query: AnalyticsQueryDto): QueryParams {
    const params: QueryParams = {};
    if (query.dateFrom) {
      params.dateFrom = query.dateFrom.toISOString();
    }
    if (query.dateTo) {
      params.dateTo = query.dateTo.toISOString();
    }
    return params;
  }

  private page(query: AnalyticsQueryDto): {
    current: number;
    pageSize: number;
    offset: number;
    sortDirection: 'ASC' | 'DESC';
  } {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    return {
      current,
      pageSize,
      offset: (current - 1) * pageSize,
      sortDirection: query.sortOrder === 'ascend' ? 'ASC' : 'DESC',
    };
  }

  private pickSortField<T extends string>(
    field: string | undefined,
    fields: Record<T, string>,
  ): string {
    if (field && Object.prototype.hasOwnProperty.call(fields, field)) {
      return fields[field as T];
    }
    return fields[Object.keys(fields)[0] as T];
  }

  private async withCache<T>(
    namespace: string,
    query: AnalyticsQueryDto,
    loader: () => Promise<AnalyticsPage<T>>,
  ): Promise<AnalyticsPage<T>> {
    const key = `analytics:${namespace}:${JSON.stringify(query)}`;
    const cached = await this.redisService.getClient().get(key);
    if (cached) {
      return JSON.parse(cached) as AnalyticsPage<T>;
    }

    const value = await loader();
    await this.redisService.getClient().setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
    return value;
  }

  private normalizeRow<T extends object>(row: RawRow): T {
    const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (key === 'isActive') {
        acc[key] = value === true || value === 1 || value === '1';
        return acc;
      }

      if (
        [
          'ordersCount',
          'ordersWithPromocode',
          'promoUsagesCount',
          'totalSpent',
          'totalFinalAmount',
          'totalDiscount',
          'discountPercent',
          'maxUsages',
          'maxUsagesPerUser',
          'usageCount',
          'uniqueUsers',
          'totalRevenue',
          'orderAmount',
          'orderFinalAmount',
          'discountAmount',
        ].includes(key)
      ) {
        acc[key] = value === null ? null : Number(value);
        return acc;
      }

      acc[key] = value;
      return acc;
    }, {});

    return normalized as T;
  }
}
