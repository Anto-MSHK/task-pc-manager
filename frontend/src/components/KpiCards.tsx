import { DollarOutlined, PercentageOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface KpiCardsProps {
  users: number;
  orders: number;
  discount: number;
  promocodes: number;
  loading?: boolean;
}

interface KpiCardSpec {
  title: string;
  value: number;
  precision?: number;
  prefix: ReactNode;
}

export function KpiCards({ users, orders, discount, promocodes, loading = false }: KpiCardsProps) {
  const cards: KpiCardSpec[] = [
    {
      title: 'Active users',
      value: users,
      prefix: <UserOutlined />,
    },
    {
      title: 'Orders',
      value: orders,
      prefix: <ShoppingCartOutlined />,
    },
    {
      title: 'Discount given',
      value: discount,
      precision: 2,
      prefix: <DollarOutlined />,
    },
    {
      title: 'Promo usages',
      value: promocodes,
      prefix: <PercentageOutlined />,
    },
  ];

  return (
    <Row gutter={[16, 16]} className="kpi-row">
      {cards.map((card) => (
        <Col xs={24} md={12} xl={6} key={card.title}>
          <Card className="glass-card">
            {loading ? (
              <div className="kpi-skeleton" aria-hidden="true">
                <span className="skeleton-shimmer kpi-skeleton-title" />
                <span className="skeleton-shimmer kpi-skeleton-value" />
              </div>
            ) : (
              <Statistic
                title={card.title}
                value={card.value}
                precision={card.precision}
                prefix={card.prefix}
              />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
}
