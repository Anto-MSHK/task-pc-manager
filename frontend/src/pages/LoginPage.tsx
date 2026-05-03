import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IMAGES } from '../config/assets';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/api';

interface LoginForm {
  email: string;
  password: string;
}

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form] = Form.useForm<LoginForm>();

  const onFinish = async (values: LoginForm) => {
    const response = await api.post<AuthResponse>('/auth/login', values);
    setAuth(response.data);
    message.success('Welcome back');
    const state = location.state as LocationState | null;
    navigate(state?.from ?? '/', { replace: true });
  };

  return (
    <div className="auth-page--cover">
      <div className="auth-cover-bg" aria-hidden>
        <img className="auth-cover-bg__img" src={IMAGES.heroBackground} alt="" decoding="async" />
      </div>
      <div className="auth-cover-stack">
        <Card className="auth-card">
          <div className="auth-card-brand">
            <img className="auth-card-logo" src={IMAGES.logo} alt="PromoCode Manager" width={152} height={152} decoding="async" />
          </div>
          <Typography.Title level={2}>Sign in</Typography.Title>
          <Typography.Paragraph type="secondary">Open analytics dashboard</Typography.Paragraph>
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="user@example.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, min: 6, message: 'Password must be at least 6 chars' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Login
            </Button>
          </Form>
          <Typography.Paragraph className="auth-link">
            No account yet? <Link to="/register">Create one</Link>
          </Typography.Paragraph>
        </Card>
      </div>
    </div>
  );
}
