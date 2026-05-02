import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#6366f1',
    borderRadius: 14,
    colorBgBase: '#0f172a',
    colorTextBase: '#e5e7eb',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: '#0f172a',
      headerBg: 'rgba(15, 23, 42, 0.82)',
      siderBg: 'rgba(15, 23, 42, 0.92)',
    },
    Card: {
      colorBgContainer: 'rgba(30, 41, 59, 0.68)',
    },
    Table: {
      colorBgContainer: 'rgba(15, 23, 42, 0.72)',
      headerBg: 'rgba(30, 41, 59, 0.95)',
    },
  },
};
