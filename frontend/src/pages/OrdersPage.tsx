import {
  CheckCircleOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Steps,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IMAGES } from '../config/assets';
import { api } from '../config/api';
import type { Order, Promocode } from '../types/api';

interface CreateOrderForm {
  amount: number;
}

interface ApplyPromoForm {
  orderId: string;
  code: string;
}

const AMOUNT_PRESETS = [49.99, 99, 149, 299];

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function OrdersPage() {
  const [createForm] = Form.useForm<CreateOrderForm>();
  const [applyForm] = Form.useForm<ApplyPromoForm>();
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState(false);

  const { data: promocodes = [] } = useQuery({
    queryKey: ['promocodes', 'all'],
    queryFn: async () => (await api.get<Promocode[]>('/promocodes')).data,
  });

  const activePromos = useMemo(
    () =>
      [...promocodes]
        .filter((p) => p.isActive)
        .sort((a, b) => a.code.localeCompare(b.code))
        .slice(0, 12),
    [promocodes],
  );

  useEffect(() => {
    if (!createdOrder) return;
    const prevCode = applyForm.getFieldValue('code') as string | undefined;
    applyForm.setFieldsValue({ orderId: createdOrder.id, code: prevCode ?? '' });
  }, [createdOrder?.id, applyForm]);

  const stepCurrent = !createdOrder ? 0 : createdOrder.promocodeId ? 2 : 1;

  const startOver = () => {
    setCreatedOrder(null);
    setAppliedPromoCode(null);
    createForm.resetFields();
    applyForm.resetFields();
  };

  const createOrder = async (values: CreateOrderForm) => {
    setCreating(true);
    try {
      const response = await api.post<Order>('/orders', values);
      setCreatedOrder(response.data);
      setAppliedPromoCode(null);
      applyForm.setFieldsValue({ orderId: response.data.id, code: '' });
      message.success('Order created — you can apply a promocode on the next step.');
    } finally {
      setCreating(false);
    }
  };

  const applyPromocode = async (values: ApplyPromoForm) => {
    const code = values.code.trim().toUpperCase();
    if (!code) {
      message.warning('Enter a promocode');
      return;
    }
    setApplying(true);
    try {
      const response = await api.post<Order>(`/orders/${values.orderId}/apply-promocode`, { code });
      setCreatedOrder(response.data);
      setAppliedPromoCode(code);
      applyForm.setFieldValue('code', '');
      message.success('Promocode applied');
    } finally {
      setApplying(false);
    }
  };

  const promoLocked = Boolean(createdOrder?.promocodeId);
  const savingsPct =
    createdOrder && createdOrder.amount > 0
      ? Math.round((createdOrder.discountAmount / createdOrder.amount) * 100)
      : 0;

  return (
    <div className="page-stack orders-page">
      <header className="orders-page-header">
        <div>
          <Typography.Title level={1} className="orders-page-title">
            Orders
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="orders-page-lead">
            Set an amount, create a draft order, then attach a promocode. Amounts and discounts stay in sync on
            the receipt.
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Link to="/analytics/promocodes">
            <Button icon={<GiftOutlined />}>Promocodes</Button>
          </Link>
          {createdOrder ? (
            <Button icon={<ReloadOutlined />} onClick={startOver}>
              New order
            </Button>
          ) : null}
        </Space>
      </header>

      <div className="orders-workspace">
        <div className="orders-main-col">
          <Card className="glass-card orders-flow-card">
            <Steps
              size="small"
              current={stepCurrent}
              className="orders-steps"
              items={[
                { title: 'Amount', description: 'Cart total' },
                { title: 'Promocode', description: 'Lock in savings' },
                { title: 'Done', description: 'Receipt ready' },
              ]}
            />
            <Divider className="orders-flow-divider" />

            <section className="orders-section" aria-labelledby="orders-amount-heading">
              <Typography.Title level={5} id="orders-amount-heading" className="orders-section-title">
                <ShoppingOutlined /> Order amount
              </Typography.Title>
              <Typography.Paragraph type="secondary" className="orders-section-hint">
                Pick a typical total or type your own. One order is tied to your account.
              </Typography.Paragraph>
              <Form form={createForm} layout="vertical" onFinish={createOrder} requiredMark="optional">
                <div className="orders-amount-presets">
                  {AMOUNT_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="orders-preset-chip"
                      onClick={() => createForm.setFieldValue('amount', v)}
                    >
                      {formatMoney(v)}
                    </button>
                  ))}
                </div>
                <Form.Item
                  name="amount"
                  label="Custom amount"
                  rules={[{ required: true, type: 'number', min: 0.01 }]}
                >
                  <InputNumber
                    min={0.01}
                    precision={2}
                    className="full-width orders-amount-input"
                    prefix="$"
                    placeholder="0.00"
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" icon={<PlusOutlined />} loading={creating}>
                  Create order
                </Button>
              </Form>
            </section>

            <Divider />

            <section className="orders-section" aria-labelledby="orders-promo-heading">
              <Typography.Title level={5} id="orders-promo-heading" className="orders-section-title">
                <GiftOutlined /> Promocode
              </Typography.Title>
              {!createdOrder ? (
                <Alert
                  type="info"
                  showIcon
                  message="Create an order first"
                  description="We will attach the new order id automatically — no copy-paste from Mongo."
                  className="orders-promo-alert"
                />
              ) : null}

              {createdOrder && activePromos.length > 0 ? (
                <div className="orders-promo-suggestions">
                  <Typography.Text type="secondary">Active codes — tap to fill</Typography.Text>
                  <div className="orders-promo-chips">
                    {activePromos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="orders-promo-chip"
                        disabled={promoLocked}
                        onClick={() => applyForm.setFieldValue('code', p.code.toUpperCase())}
                      >
                        <span className="orders-promo-chip-code">{p.code}</span>
                        <span className="orders-promo-chip-pct">{p.discountPercent}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <Form form={applyForm} layout="vertical" onFinish={applyPromocode} className="orders-promo-form">
                <Form.Item name="orderId" hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="code"
                  label="Code"
                  rules={[{ required: !promoLocked, min: 2 }]}
                  className="orders-promo-code-item"
                >
                  <Input
                    placeholder="e.g. SUMMER25"
                    disabled={promoLocked}
                    className="orders-promo-input"
                    onBlur={(e) => {
                      const v = e.target.value.trim().toUpperCase();
                      if (v) applyForm.setFieldValue('code', v);
                    }}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={applying}
                  disabled={promoLocked || !createdOrder}
                >
                  {promoLocked ? 'Promocode applied' : 'Apply promocode'}
                </Button>
                {promoLocked ? (
                  <Typography.Paragraph type="secondary" className="orders-promo-footnote">
                    Each order accepts one promocode. Start a new order to try another code.
                  </Typography.Paragraph>
                ) : null}
              </Form>
            </section>
          </Card>
        </div>

        <aside className="orders-receipt-col">
          <div className={`orders-receipt glass-card ${createdOrder ? 'orders-receipt--filled' : 'orders-receipt--empty'}`}>
            {!createdOrder ? (
              <>
                <img className="orders-receipt-illus" src={IMAGES.emptyOrder} alt="" decoding="async" />
                <Typography.Title level={4} className="orders-receipt-title">
                  No order yet
                </Typography.Title>
                <Typography.Paragraph type="secondary" className="orders-receipt-copy">
                  Your subtotal, discount line, and payable total will appear here as soon as you create an order.
                </Typography.Paragraph>
              </>
            ) : (
              <>
                <div className="orders-receipt-badge-row">
                  {promoLocked ? (
                    <span className="orders-receipt-badge orders-receipt-badge--ok">
                      <CheckCircleOutlined /> Saved
                    </span>
                  ) : (
                    <span className="orders-receipt-badge orders-receipt-badge--pending">Draft</span>
                  )}
                </div>
                <Typography.Text type="secondary" className="orders-receipt-label">
                  Order id
                </Typography.Text>
                <Typography.Paragraph copyable className="orders-receipt-id">
                  {createdOrder.id}
                </Typography.Paragraph>
                <ul className="orders-receipt-lines">
                  <li>
                    <span>Subtotal</span>
                    <span>{formatMoney(createdOrder.amount)}</span>
                  </li>
                  <li className="orders-receipt-lines--discount">
                    <span>Discount{promoLocked && savingsPct > 0 ? ` (${savingsPct}%)` : ''}</span>
                    <span>−{formatMoney(createdOrder.discountAmount)}</span>
                  </li>
                  <li className="orders-receipt-lines--total">
                    <span>Total due</span>
                    <span>{formatMoney(createdOrder.finalAmount)}</span>
                  </li>
                </ul>
                {appliedPromoCode && promoLocked ? (
                  <div className="orders-receipt-promo-line">
                    <GiftOutlined /> <strong>{appliedPromoCode}</strong>
                  </div>
                ) : null}
                <Divider className="orders-receipt-divider" />
                <Typography.Text type="secondary" className="orders-receipt-meta">
                  Created {dayjs(createdOrder.createdAt).format('MMM D, YYYY · HH:mm')}
                </Typography.Text>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
