import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Card, Typography } from 'antd';
import { useMemo } from 'react';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { PromoUsageAnalyticsRow } from '../types/api';

export function PromoUsagesPage() {
  const range = useDateRangeStore((state) => state.range);
  const request = useAnalyticsTable<PromoUsageAnalyticsRow>('/analytics/promo-usages');

  const columns = useMemo<ProColumns<PromoUsageAnalyticsRow>[]>(
    () => [
      { title: 'Search', dataIndex: 'search', hideInTable: true },
      {
        title: 'Min discount',
        dataIndex: 'minDiscountAmount',
        valueType: 'digit',
        hideInTable: true,
      },
      {
        title: 'Max discount',
        dataIndex: 'maxDiscountAmount',
        valueType: 'digit',
        hideInTable: true,
      },
      { title: 'Promocode', dataIndex: 'promocodeCode', sorter: true },
      { title: 'User', dataIndex: 'userName', sorter: true },
      { title: 'Email', dataIndex: 'userEmail', sorter: true },
      { title: 'Order ID', dataIndex: 'orderId', copyable: true, ellipsis: true },
      { title: 'Order amount', dataIndex: 'orderAmount', valueType: 'money', search: false },
      { title: 'Final amount', dataIndex: 'orderFinalAmount', valueType: 'money', search: false },
      { title: 'Discount', dataIndex: 'discountAmount', valueType: 'money', sorter: true, search: false },
      { title: 'Used at', dataIndex: 'usedAt', valueType: 'dateTime', sorter: true, search: false },
    ],
    [],
  );

  return (
    <div className="page-stack">
      <Typography.Title level={1}>Promo usages</Typography.Title>
      <Card className="glass-card">
        <ProTable<PromoUsageAnalyticsRow>
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
