import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Card, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { UsersAnalyticsRow } from '../types/api';

export function UsersAnalyticsPage() {
  const range = useDateRangeStore((state) => state.range);
  const request = useAnalyticsTable<UsersAnalyticsRow>('/analytics/users');

  const columns = useMemo<ProColumns<UsersAnalyticsRow>[]>(
    () => [
      { title: 'Search', dataIndex: 'search', hideInTable: true },
      {
        title: 'Min orders',
        dataIndex: 'minOrders',
        valueType: 'digit',
        hideInTable: true,
      },
      {
        title: 'Max orders',
        dataIndex: 'maxOrders',
        valueType: 'digit',
        hideInTable: true,
      },
      { title: 'Name', dataIndex: 'name', sorter: true },
      { title: 'Email', dataIndex: 'email', sorter: true },
      {
        title: 'Status',
        dataIndex: 'isActive',
        sorter: true,
        filters: true,
        onFilter: true,
        valueEnum: {
          true: { text: 'Active', status: 'Success' },
          false: { text: 'Inactive', status: 'Default' },
        },
        render: (_, row) => <Tag color={row.isActive ? 'green' : 'default'}>{row.isActive ? 'Active' : 'Inactive'}</Tag>,
      },
      { title: 'Orders', dataIndex: 'ordersCount', sorter: true, search: false },
      { title: 'Promo usages', dataIndex: 'promoUsagesCount', sorter: true, search: false },
      { title: 'Spent', dataIndex: 'totalSpent', valueType: 'money', sorter: true, search: false },
      { title: 'Discount', dataIndex: 'totalDiscount', valueType: 'money', sorter: true, search: false },
      { title: 'Last order', dataIndex: 'lastOrderAt', valueType: 'dateTime', sorter: true, search: false },
    ],
    [],
  );

  return (
    <div className="page-stack">
      <Typography.Title level={1}>Users analytics</Typography.Title>
      <Card className="glass-card">
        <ProTable<UsersAnalyticsRow>
          key={`${range[0].toISOString()}-${range[1].toISOString()}`}
          rowKey="id"
          columns={columns}
          request={request}
          pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
}
