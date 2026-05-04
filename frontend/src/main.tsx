import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProConfigProvider, enUSIntl } from '@ant-design/pro-components';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { queryClient } from './config/queryClient';
import { theme } from './config/theme';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider theme={{ ...theme, algorithm: antdTheme.darkAlgorithm, cssVar: { key: 'app' } }} locale={enUS}>
      <ProConfigProvider intl={enUSIntl}>
        <AntApp>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </AntApp>
      </ProConfigProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
