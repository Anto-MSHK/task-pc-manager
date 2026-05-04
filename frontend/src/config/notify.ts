import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';

let _notification: NotificationInstance | null = null;
let _message: MessageInstance | null = null;

export function setAntdInstances(
  notification: NotificationInstance,
  message: MessageInstance,
): void {
  _notification = notification;
  _message = message;
}

export function notifyError(message: string, description?: string): void {
  _notification?.error({ message, description });
}

export function notifySuccess(content: string): void {
  _message?.success(content);
}

export function notifyWarning(content: string): void {
  _message?.warning(content);
}
