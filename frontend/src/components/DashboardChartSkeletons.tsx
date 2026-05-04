import { Card, Col, Row, Typography } from 'antd';

/** Match `ResponsiveContainer` / chart geometry in `DashboardCharts.tsx`. */
export const DASHBOARD_TREND_CHART_HEIGHT_PX = 340;
/** Same as trend — keeps the two top-row cards aligned on xl. */
export const DASHBOARD_PIE_CHART_HEIGHT_PX = DASHBOARD_TREND_CHART_HEIGHT_PX;
export const DASHBOARD_TOP_PROMOS_PAGE_SIZE = 8;
export const DASHBOARD_TOP_PROMOS_ROW_HEIGHT_PX = 44;

export function dashboardTopPromosChartHeightPx(rowCount: number): number {
  return Math.max(220, rowCount * DASHBOARD_TOP_PROMOS_ROW_HEIGHT_PX);
}

/** Left/right Y-axis tick placeholders — widths match Recharts YAxis `width` props. */
function AxisTicksSkeleton({ wide }: { wide: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton-axis dashboard-chart-skeleton-axis--${wide ? 'wide' : 'narrow'}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="skeleton-shimmer dashboard-chart-skeleton-axis__tick" />
      ))}
    </div>
  );
}

export function TrendChartSkeleton() {
  const barHeightsPct = [52, 68, 45, 72, 58, 80, 48, 66, 74, 55, 62, 50];
  return (
    <div
      className="dashboard-chart-skeleton-trend"
      style={{ height: DASHBOARD_TREND_CHART_HEIGHT_PX }}
      aria-hidden
    >
      <div className="dashboard-chart-skeleton-trend__row">
        <AxisTicksSkeleton wide />
        <div className="dashboard-chart-skeleton-trend__plot">
          <div className="dashboard-chart-skeleton-trend__grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="dashboard-chart-skeleton-trend__gridline" />
            ))}
          </div>
          <div className="dashboard-chart-skeleton-trend__bars">
            {barHeightsPct.map((h, i) => (
              <div key={i} className="dashboard-chart-skeleton-trend__bar-wrap">
                <div
                  className="skeleton-shimmer dashboard-chart-skeleton-trend__bar"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <AxisTicksSkeleton wide={false} />
      </div>
      <div className="dashboard-chart-skeleton-trend__legend">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-chart-skeleton-trend__legend-item">
            <span className="skeleton-shimmer dashboard-chart-skeleton-trend__legend-swatch" />
            <span className="skeleton-shimmer dashboard-chart-skeleton-trend__legend-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChartSkeleton() {
  return (
    <div
      className="dashboard-chart-skeleton-pie"
      style={{ height: DASHBOARD_PIE_CHART_HEIGHT_PX }}
      aria-hidden
    >
      <div className="dashboard-chart-skeleton-pie__donut-wrap">
        <div className="skeleton-shimmer dashboard-chart-skeleton-pie__ring" />
      </div>
      <div className="dashboard-chart-skeleton-pie__legend">
        <div className="dashboard-chart-skeleton-pie__legend-item">
          <span className="skeleton-shimmer dashboard-chart-skeleton-pie__legend-swatch" />
          <span className="skeleton-shimmer dashboard-chart-skeleton-pie__legend-line" />
        </div>
        <div className="dashboard-chart-skeleton-pie__legend-item">
          <span className="skeleton-shimmer dashboard-chart-skeleton-pie__legend-swatch" />
          <span className="skeleton-shimmer dashboard-chart-skeleton-pie__legend-line" />
        </div>
      </div>
    </div>
  );
}

export function TopPromocodesBarSkeleton({ rows = DASHBOARD_TOP_PROMOS_PAGE_SIZE }: { rows?: number }) {
  const heightPx = dashboardTopPromosChartHeightPx(rows);
  const widthsPct = [92, 78, 64, 55, 48, 40, 34, 28];
  return (
    <div className="dashboard-chart-skeleton-hbars" style={{ height: heightPx }} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-chart-skeleton-hbars__row">
          <span className="skeleton-shimmer dashboard-chart-skeleton-hbars__label" />
          <div className="dashboard-chart-skeleton-hbars__track">
            <span
              className="skeleton-shimmer dashboard-chart-skeleton-hbars__bar"
              style={{ width: `${widthsPct[i % widthsPct.length]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full dashboard charts grid — use inside Suspense while the lazy chunk loads. */
export function DashboardChartsFullSkeleton() {
  return (
    <div className="dashboard-charts">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="glass-card dashboard-chart-card" title="Revenue & activity">
            <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
              Orders, revenue, promo applies and discounts per day in the selected range.
            </Typography.Paragraph>
            <div className="dashboard-chart-body">
              <TrendChartSkeleton />
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="glass-card dashboard-chart-card" title="Orders mix">
            <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
              Share of orders that used a promocode in this period.
            </Typography.Paragraph>
            <div className="dashboard-chart-body dashboard-chart-body--pie">
              <PieChartSkeleton />
            </div>
          </Card>
        </Col>
      </Row>
      <Card className="glass-card dashboard-chart-card dashboard-chart-card--wide" title="Top promocodes by usage">
        <Typography.Paragraph type="secondary" className="dashboard-chart-sub">
          Most applied codes in the selected date range (by usage count).
        </Typography.Paragraph>
        <div className="dashboard-chart-body">
          <TopPromocodesBarSkeleton />
        </div>
      </Card>
    </div>
  );
}
