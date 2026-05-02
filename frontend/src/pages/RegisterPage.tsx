import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/api';

interface RegisterForm {
  email: string;
  name: string;
  phone?: string;
  password: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const onFinish = async (values: RegisterForm) => {
    const response = await api.post<AuthResponse>('/auth/register', values);
    setAuth(response.data);
    message.success('Account created');
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>Create account</Typography.Title>
        <Typography.Paragraph type="secondary">Register and start managing promocodes</Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, min: 2, message: 'Name is required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input prefix={<PhoneOutlined />} placeholder="+1 555 0100" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 6, message: 'Password must be at least 6 chars' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Register
          </Button>
        </Form>
        <Typography.Paragraph className="auth-link">
          Already registered? <Link to="/login">Sign in</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
