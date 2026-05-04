import { App } from 'antd';
import { useEffect } from 'react';
import { setAntdInstances } from '../config/notify';

/**
 * Registers Ant Design's themed notification and message instances so they can
 * be called from outside React (e.g. Axios interceptors). Must be mounted inside
 * <App> (AntApp) which is inside <ConfigProvider>, so theme tokens are applied.
 */
export function AntdServiceProvider() {
  const { notification, message } = App.useApp();
  useEffect(() => {
    setAntdInstances(notification, message);
  }, [notification, message]);
  return null;
}
