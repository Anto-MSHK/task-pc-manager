import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Switch, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { api } from '../config/api';
import { useAnalyticsTable } from '../hooks/useAnalyticsTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { PromocodesAnalyticsRow } from '../types/api';

interface PromocodeForm {
  code: string;
  discountPercent: number;
  maxUsages?: number;
  maxUsagesPerUser?: number;
  dateFrom?: dayjs.Dayjs;
  dateTo?: dayjs.Dayjs;
  isActive?: boolean;
}

export function PromocodesPage() {
  const range = useDateRangeStore((state) => state.range);
  const request = useAnalyticsTable<PromocodesAnalyticsRow>('/analytics/promocodes');
  const actionRef = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromocodesAnalyticsRow | null>(null);
  const [form] = Form.useForm<PromocodeForm>();

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const submit = async (values: PromocodeForm) => {
    const payload = {
      ...values,
      dateFrom: values.dateFrom?.toISOString(),
      dateTo: values.dateTo?.toISOString(),
    };

    if (editing) {
      await api.patch(`/promocodes/${editing.id}`, payload);
      message.success('Promocode updated');
    } else {
      await api.post('/promocodes', payload);
      message.success('Promocode created');
    }

    closeModal();
    actionRef.current?.reload();
  };

  const columns = useMemo<ProColumns<PromocodesAnalyticsRow>[]>(
    () => [
      { title: 'Search code', dataIndex: 'search', hideInTable: true },
      { title: 'Min usages', dataIndex: 'minUsageCount', valueType: 'digit', hideInTable: true },
      { title: 'Max usages', dataIndex: 'maxUsageCount', valueType: 'digit', hideInTable: true },
      { title: 'Code', dataIndex: 'code', sorter: true },
      { title: 'Discount %', dataIndex: 'discountPercent', sorter: true, search: false },
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
      { title: 'Usage count', dataIndex: 'usageCount', sorter: true, search: false },
      { title: 'Unique users', dataIndex: 'uniqueUsers', sorter: true, search: false },
      { title: 'Discount', dataIndex: 'totalDiscount', valueType: 'money', sorter: true, search: false },
      { title: 'Revenue', dataIndex: 'totalRevenue', valueType: 'money', sorter: true, search: false },
      { title: 'Last used', dataIndex: 'lastUsedAt', valueType: 'dateTime', sorter: true, search: false },
      {
        title: 'Actions',
        valueType: 'option',
        render: (_, row) => [
          <Button
            key="edit"
            type="link"
            onClick={() => {
              setEditing(row);
              form.setFieldsValue({
                code: row.code,
                discountPercent: row.discountPercent,
                maxUsages: row.maxUsages ?? undefined,
                maxUsagesPerUser: row.maxUsagesPerUser ?? undefined,
                dateFrom: row.dateFrom ? dayjs(row.dateFrom) : undefined,
                dateTo: row.dateTo ? dayjs(row.dateTo) : undefined,
                isActive: row.isActive,
              });
              setOpen(true);
            }}
          >
            Edit
          </Button>,
          <Button
            key="deactivate"
            type="link"
            danger
            disabled={!row.isActive}
            onClick={async () => {
              await api.patch(`/promocodes/${row.id}/deactivate`);
              message.warning('Promocode deactivated');
              actionRef.current?.reload();
            }}
          >
            Deactivate
          </Button>,
        ],
      },
    ],
    [form],
  );

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <Typography.Title level={1}>Promocodes</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Create promocode
        </Button>
      </div>
      <Card className="glass-card">
        <ProTable<PromocodesAnalyticsRow>
          key={`${range[0].toISOString()}-${range[1].toISOString()}`}
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={request}
          pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        />
      </Card>
      <Modal
        title={editing ? 'Edit promocode' : 'Create promocode'}
        open={open}
        onCancel={closeModal}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ isActive: true }}>
          <Form.Item name="code" label="Code" rules={[{ required: true, min: 3 }]}>
            <Input placeholder="SUMMER25" />
          </Form.Item>
          <Form.Item name="discountPercent" label="Discount %" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} className="full-width" />
          </Form.Item>
          <Space>
            <Form.Item name="maxUsages" label="Total limit">
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="maxUsagesPerUser" label="Per-user limit">
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="dateFrom" label="Date from">
              <DatePicker showTime />
            </Form.Item>
            <Form.Item name="dateTo" label="Date to">
              <DatePicker showTime />
            </Form.Item>
          </Space>
          {editing ? (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
