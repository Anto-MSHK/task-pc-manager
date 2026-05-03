import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { useMemo } from 'react';
import { IMAGES } from '../config/assets';
import { AnalyticsTableHost } from '../components/AnalyticsTableHost';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useSearchFormProps } from '../hooks/useSearchFormProps';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { PromoUsageAnalyticsRow } from '../types/api';

export function PromoUsagesPage() {
  const range = useDateRangeStore((state) => state.range);
  const { loading, request, actionRef, formRef } = useAnalyticsTable<PromoUsageAnalyticsRow>('/analytics/promo-usages');
  const searchFormProps = useSearchFormProps(formRef);

  const dateRangeParams = useMemo(
    () => ({
      dateFrom: range[0].toISOString(),
      dateTo: range[1].toISOString(),
    }),
    [range],
  );

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
      { title: 'Promocode', dataIndex: 'promocodeCode', sorter: true, search: false },
      { title: 'User', dataIndex: 'userName', sorter: true, search: false },
      { title: 'Email', dataIndex: 'userEmail', sorter: true, search: false },
      { title: 'Order ID', dataIndex: 'orderId', copyable: true, ellipsis: true, search: false },
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
      <Card className="glass-card table-card">
        <AnalyticsTableHost loading={loading}>
          <ProTable<PromoUsageAnalyticsRow>
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
              emptyText: (
                <Empty
                  image={IMAGES.emptyOrder}
                  imageStyle={{ height: 140 }}
                  description="No promo usages in this date range"
                />
              ),
            }}
          />
        </AnalyticsTableHost>
      </Card>
    </div>
  );
}
