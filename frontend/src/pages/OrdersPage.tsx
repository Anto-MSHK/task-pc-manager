import { Button, Card, Form, Input, InputNumber, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { api } from '../config/api';
import type { Order } from '../types/api';

interface CreateOrderForm {
  amount: number;
}

interface ApplyPromoForm {
  orderId: string;
  code: string;
}

export function OrdersPage() {
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [applyForm] = Form.useForm<ApplyPromoForm>();

  const createOrder = async (values: CreateOrderForm) => {
    const response = await api.post<Order>('/orders', values);
    setCreatedOrder(response.data);
    applyForm.setFieldValue('orderId', response.data.id);
    message.success('Order created');
  };

  const applyPromocode = async (values: ApplyPromoForm) => {
    const response = await api.post<Order>(`/orders/${values.orderId}/apply-promocode`, {
      code: values.code,
    });
    setCreatedOrder(response.data);
    message.success('Promocode applied');
  };

  return (
    <div className="page-stack">
      <Typography.Title level={1}>Orders</Typography.Title>
      <Space align="start" size={16} wrap>
        <Card className="glass-card action-card" title="Create order">
          <Form layout="vertical" onFinish={createOrder}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 0.01 }]}>
              <InputNumber min={0.01} precision={2} className="full-width" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create
            </Button>
          </Form>
        </Card>
        <Card className="glass-card action-card" title="Apply promocode">
          <Form form={applyForm} layout="vertical" onFinish={applyPromocode}>
            <Form.Item name="orderId" label="Order ID" rules={[{ required: true }]}>
              <Input placeholder="Mongo order id" />
            </Form.Item>
            <Form.Item name="code" label="Promocode" rules={[{ required: true, min: 3 }]}>
              <Input placeholder="SUMMER25" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Apply
            </Button>
          </Form>
        </Card>
        {createdOrder ? (
          <Card className="glass-card action-card" title="Latest order">
            <Typography.Paragraph copyable>{createdOrder.id}</Typography.Paragraph>
            <Typography.Text>Amount: {createdOrder.amount}</Typography.Text>
            <br />
            <Typography.Text>Discount: {createdOrder.discountAmount}</Typography.Text>
            <br />
            <Typography.Text strong>Final: {createdOrder.finalAmount}</Typography.Text>
          </Card>
        ) : null}
      </Space>
    </div>
  );
}
