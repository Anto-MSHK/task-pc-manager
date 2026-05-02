import {
  BarChartOutlined,
  GiftOutlined,
  LogoutOutlined,
  PercentageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DateRangeFilter } from './DateRangeFilter';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <Layout className="app-shell">
      <Sider breakpoint="lg" collapsedWidth="0" width={250} className="app-sider">
        <div className="brand">PromoCode Manager</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: '/', icon: <BarChartOutlined />, label: 'Dashboard' },
            { key: '/analytics/users', icon: <UserOutlined />, label: 'Users analytics' },
            { key: '/analytics/promocodes', icon: <GiftOutlined />, label: 'Promocodes' },
            {
              key: '/analytics/promo-usages',
              icon: <PercentageOutlined />,
              label: 'Promo usages',
            },
            { key: '/orders', icon: <BarChartOutlined />, label: 'Orders' },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <DateRangeFilter />
          <div className="header-user">
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
