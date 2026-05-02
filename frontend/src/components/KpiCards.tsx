import { Card, Col, Row, Statistic } from 'antd';
import { DollarOutlined, PercentageOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';

interface KpiCardsProps {
  users: number;
  orders: number;
  discount: number;
  promocodes: number;
}

export function KpiCards({ users, orders, discount, promocodes }: KpiCardsProps) {
  return (
    <Row gutter={[16, 16]} className="kpi-row">
      <Col xs={24} md={12} xl={6}>
        <Card className="glass-card">
          <Statistic title="Active users" value={users} prefix={<UserOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card className="glass-card">
          <Statistic title="Orders" value={orders} prefix={<ShoppingCartOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card className="glass-card">
          <Statistic title="Discount given" value={discount} precision={2} prefix={<DollarOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card className="glass-card">
          <Statistic title="Promo usages" value={promocodes} prefix={<PercentageOutlined />} />
        </Card>
      </Col>
    </Row>
  );
}
