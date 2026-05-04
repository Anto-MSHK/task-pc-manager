import { Card, Col, Empty, Row, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DASHBOARD_TREND_CHART_HEIGHT_PX,
  dashboardTopPromosChartHeightPx,
  PieChartSkeleton,
  TopPromocodesBarSkeleton,
  TrendChartSkeleton,
} from './DashboardChartSkeletons';
import type { AnalyticsSummary, DashboardSeriesPoint, PromocodesAnalyticsRow } from '../types/api';

const chartTooltip = {
  contentStyle: {
    background: 'rgba(28, 22, 18, 0.94)',
    border: '1px solid rgba(168, 85, 247, 0.28)',
    borderRadius: 12,
    boxShadow: '0 18px 48px rgba(9, 6, 4, 0.45)',
  },
  labelStyle: { color: 'rgba(231, 229, 228, 0.85)', fontWeight: 600 },
  itemStyle: { color: 'rgba(250, 250, 249, 0.92)' },
  formatter: (value: number, name: string) => {
    if (name === 'Revenue') {
      return [value.toLocaleString(undefined, { maximumFractionDigits: 0 }), name];
    }
    if (name === 'Discount') {
      return [value.toLocaleString(undefined, { maximumFractionDigits: 0 }), name];
    }
    return [value, name];
  },
};

const axisStroke = 'rgba(168, 162, 158, 0.35)';
const gridStroke = 'rgba(255, 255, 255, 0.06)';

function formatMoneyShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

export interface DashboardChartsProps {
  series: DashboardSeriesPoint[];
  summary: AnalyticsSummary | undefined;
  topPromocodes: PromocodesAnalyticsRow[];
  loadingSeries: boolean;
  loadingSummary: boolean;
  loadingPromocodes: boolean;
}

export function DashboardCharts({
  series,
  summary,
  topPromocodes,
  loadingSeries,
  loadingSummary,
  loadingPromocodes,
}: DashboardChartsProps) {
  const trendData = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        label: dayjs(row.date).isValid() ? dayjs(row.date).format('MMM D') : row.date,
      })),
    [series],
  );

  const pieData = useMemo(() => {
    if (!summary) {
      return [];
    }
    const withPromo = summary.ordersWithPromo;
    const without = Math.max(0, summary.totalOrders - summary.ordersWithPromo);
    if (withPromo === 0 && without === 0) {
      return [];
    }
    return [
      { name: 'With promocode', value: withPromo, fill: 'var(--chart-violet)' },
      { name: 'Without', value: without, fill: 'var(--chart-amber)' },
    ];
  }, [summary]);

  const barData = useMemo(
    () =>
      topPromocodes.map((row) => ({
        code: row.code.length > 14 ? `${row.code.slice(0, 12)}…` : row.code,
        usages: row.usageCount,
        discount: row.totalDiscount,
      })),
    [topPromocodes],
  );

  const barChartHeight = dashboardTopPromosChartHeightPx(Math.max(1, barData.length));

  return (
    <div className="dashboard-charts">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="glass-card dashboard-chart-card" title="Revenue & activity">
            <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
              Orders, revenue, promo applies and discounts per day in the selected range.
            </Typography.Paragraph>
            <div className="dashboard-chart-body">
              {loadingSeries ? (
                <TrendChartSkeleton />
              ) : trendData.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No series data for this range" />
              ) : (
                <ResponsiveContainer width="100%" height={DASHBOARD_TREND_CHART_HEIGHT_PX}>
                  <ComposedChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashFillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-violet)" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="var(--chart-violet)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashFillDiscount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-coral)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-coral)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(214, 211, 209, 0.75)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: axisStroke }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={formatMoneyShort}
                      tick={{ fill: 'rgba(214, 211, 209, 0.72)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: axisStroke }}
                      width={44}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'rgba(214, 211, 209, 0.72)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: axisStroke }}
                      width={36}
                    />
                    <Tooltip {...chartTooltip} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar yAxisId="right" dataKey="orders" name="Orders" fill="var(--chart-amber)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="discount"
                      name="Discount"
                      stroke="var(--chart-coral)"
                      strokeWidth={1.6}
                      fill="url(#dashFillDiscount)"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="var(--chart-violet)"
                      strokeWidth={2}
                      fill="url(#dashFillRevenue)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="promoUsages"
                      name="Promo applies"
                      stroke="var(--chart-mint)"
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: 'var(--chart-mint)' }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="glass-card dashboard-chart-card" title="Orders mix">
            <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
              Share of orders that used a promocode in this period.
            </Typography.Paragraph>
            <div className="dashboard-chart-body dashboard-chart-body--pie">
              {loadingSummary ? (
                <PieChartSkeleton />
              ) : pieData.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders in range" />
              ) : (
                <ResponsiveContainer width="100%" height={DASHBOARD_TREND_CHART_HEIGHT_PX}>
                  <PieChart>
                    <Tooltip {...chartTooltip} />
                    <Legend verticalAlign="bottom" />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} stroke="rgba(12, 10, 9, 0.35)" strokeWidth={1} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="glass-card dashboard-chart-card dashboard-chart-card--wide" title="Top promocodes by usage">
        <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
          Most applied codes in the selected date range (by usage count).
        </Typography.Paragraph>
        <div className="dashboard-chart-body">
          {loadingPromocodes ? (
            <TopPromocodesBarSkeleton />
          ) : barData.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No promocode usage in range" />
          ) : (
            <ResponsiveContainer width="100%" height={barChartHeight}>
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(214, 211, 209, 0.72)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: axisStroke }} />
                <YAxis
                  type="category"
                  dataKey="code"
                  width={112}
                  tick={{ fill: 'rgba(250, 250, 249, 0.88)', fontSize: 12, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: axisStroke }}
                />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="usages" name="Usages" radius={[0, 8, 8, 0]} maxBarSize={22}>
                  {barData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0
                          ? 'var(--chart-amber)'
                          : i === 1
                            ? 'var(--chart-coral)'
                            : 'rgba(196, 181, 253, 0.55)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
