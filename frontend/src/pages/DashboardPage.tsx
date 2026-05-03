import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography } from 'antd';
import { useMemo } from 'react';
import { KpiCards } from '../components/KpiCards';
import { AnalyticsTableHost } from '../components/AnalyticsTableHost';
import { api } from '../config/api';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { AnalyticsSummary, UsersAnalyticsRow } from '../types/api';

export function DashboardPage() {
  const range = useDateRangeStore((state) => state.range);
  const { loading: tableLoading, request } = useAnalyticsTable<UsersAnalyticsRow>('/analytics/users');

  const dateParams = useMemo(
    () => ({
      dateFrom: range[0].toISOString(),
      dateTo: range[1].toISOString(),
    }),
    [range],
  );

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', dateParams],
    queryFn: async () =>
      (await api.get<AnalyticsSummary>('/analytics/summary', { params: dateParams })).data,
  });

  const totals = useMemo(
    () => ({
      users: summary?.activeUsers ?? 0,
      orders: summary?.totalOrders ?? 0,
      discount: summary?.totalDiscount ?? 0,
      promocodes: summary?.promoUsages ?? 0,
    }),
    [summary],
  );

  const columns = useMemo<ProColumns<UsersAnalyticsRow>[]>(
    () => [
      { title: 'User', dataIndex: 'name', sorter: true },
      { title: 'Email', dataIndex: 'email', sorter: true },
      { title: 'Orders', dataIndex: 'ordersCount', sorter: true, search: false },
      { title: 'Spent', dataIndex: 'totalSpent', valueType: 'money', sorter: true, search: false },
      {
        title: 'Discount',
        dataIndex: 'totalDiscount',
        valueType: 'money',
        sorter: true,
        search: false,
      },
    ],
    [],
  );

  return (
    <div className="page-stack">
      <div>
        <Typography.Title level={1}>Dashboard</Typography.Title>
        <Typography.Paragraph type="secondary">
          Live ClickHouse analytics with a shared Redis-cached date range.
        </Typography.Paragraph>
      </div>
      <KpiCards {...totals} loading={summaryLoading || !summary} />
      <Card className="glass-card table-card dashboard-table-card">
        <AnalyticsTableHost loading={tableLoading}>
          <ProTable<UsersAnalyticsRow>
            params={dateParams}
            rowKey="id"
            columns={columns}
            request={request}
            loading={false}
            defaultSize="middle"
            tableClassName="analytics-table"
            scroll={{ x: 'max-content' }}
            search={false}
            pagination={{
              pageSize: 10,
              position: ['bottomCenter'],
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            }}
            toolBarRender={false}
            locale={{
              emptyText: 'No users in this date range',
            }}
          />
        </AnalyticsTableHost>
      </Card>
    </div>
  );
}
