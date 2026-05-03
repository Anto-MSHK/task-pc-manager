import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Card, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { AnalyticsTableHost } from '../components/AnalyticsTableHost';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useSearchFormProps } from '../hooks/useSearchFormProps';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { UsersAnalyticsRow } from '../types/api';

export function UsersAnalyticsPage() {
  const range = useDateRangeStore((state) => state.range);
  const { loading, request, actionRef, formRef } = useAnalyticsTable<UsersAnalyticsRow>('/analytics/users');
  const searchFormProps = useSearchFormProps(formRef);

  const dateRangeParams = useMemo(
    () => ({
      dateFrom: range[0].toISOString(),
      dateTo: range[1].toISOString(),
    }),
    [range],
  );

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
      { title: 'Name', dataIndex: 'name', sorter: true, search: false },
      { title: 'Email', dataIndex: 'email', sorter: true, search: false },
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
        render: (_, row) => (
          <Tag
            bordered={false}
            className={`status-badge ${row.isActive ? 'status-badge--active' : 'status-badge--inactive'}`}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </Tag>
        ),
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
      <Card className="glass-card table-card">
        <AnalyticsTableHost loading={loading}>
          <ProTable<UsersAnalyticsRow>
            params={dateRangeParams}
            actionRef={actionRef}
            formRef={formRef}
            rowKey="id"
            columns={columns}
            request={request}
            loading={false}
            defaultSize="middle"
            tableClassName="analytics-table"
            scroll={{ x: 'max-content' }}
            search={searchFormProps}
            options={{ density: false, fullScreen: true, reload: true, setting: true }}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            }}
            locale={{
              emptyText: 'No users in this date range',
            }}
          />
        </AnalyticsTableHost>
      </Card>
    </div>
  );
}
