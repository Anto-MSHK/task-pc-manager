import axios, { AxiosError } from 'axios';
import { notification } from 'antd';
import { useAuthStore } from '../store/authStore';
import type { ApiErrorResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const rawMessage = error.response?.data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : rawMessage ?? error.message;

    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }

    notification.error({
      message: status ? `API error ${status}` : 'API error',
      description: message,
    });

    return Promise.reject(error);
  },
);
