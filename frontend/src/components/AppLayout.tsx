import {
  BarChartOutlined,
  GiftOutlined,
  LogoutOutlined,
  PercentageOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IMAGES } from '../config/assets';
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
      <Sider breakpoint="lg" collapsedWidth="0" width={264} className="app-sider">
        <div className="app-sider-inner">
          <div className="brand">
            <img src={IMAGES.logo} alt="" className="brand-logo" width={48} height={48} />
            <div className="brand-text">
              <span className="brand-title">PromoCode</span>
              <span className="brand-sub">Manager</span>
            </div>
          </div>
          <nav className="app-sider-nav" aria-label="Main navigation">
            <Menu
              theme="dark"
              mode="inline"
              selectable
              selectedKeys={[location.pathname]}
              onClick={({ key }) => navigate(key)}
              className="app-sider-menu"
              items={[
                {
                  type: 'group',
                  label: <span className="app-sider-group-label">Overview</span>,
                  children: [
                    { key: '/', icon: <BarChartOutlined />, label: 'Dashboard' },
                  ],
                },
                {
                  type: 'group',
                  label: <span className="app-sider-group-label">Analytics</span>,
                  children: [
                    { key: '/analytics/users', icon: <UserOutlined />, label: 'Users' },
                    { key: '/analytics/promocodes', icon: <GiftOutlined />, label: 'Promocodes' },
                    {
                      key: '/analytics/promo-usages',
                      icon: <PercentageOutlined />,
                      label: 'Promo usages',
                    },
                  ],
                },
                {
                  type: 'group',
                  label: <span className="app-sider-group-label">Operations</span>,
                  children: [{ key: '/orders', icon: <ShoppingOutlined />, label: 'Orders' }],
                },
              ]}
            />
          </nav>
        </div>
      </Sider>
      <Layout className="app-main">
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
