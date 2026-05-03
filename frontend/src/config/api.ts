import axios, { AxiosError, isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { notification } from 'antd';
import { useAuthStore } from '../store/authStore';
import type { ApiErrorResponse, TokenPair } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

type RequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthCredentialsEndpoint(config: InternalAxiosRequestConfig): boolean {
  const path = `${config.baseURL ?? ''}${config.url ?? ''}`;
  return /\/auth\/(login|register)(?:\?|$)/.test(path);
}

let refreshMutex: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (!refreshMutex) {
    refreshMutex = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      const { data } = await axios.post<TokenPair>(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      useAuthStore.getState().setTokens(data);
    })().finally(() => {
      refreshMutex = null;
    });
  }
  await refreshMutex;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function notifyApiError(error: AxiosError<ApiErrorResponse>) {
  const status = error.response?.status;
  const rawMessage = error.response?.data?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : rawMessage ?? error.message;

  notification.error({
    message: status ? `API error ${status}` : 'API error',
    description: message,
  });
}

function forceLogoutRedirect() {
  useAuthStore.getState().logout();
  window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const { response, config } = error;
    const status = response?.status;
    const originalRequest = config as RequestConfig;

    if (status !== 401) {
      notifyApiError(error);
      return Promise.reject(error);
    }

    if (isAuthCredentialsEndpoint(originalRequest)) {
      notifyApiError(error);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      forceLogoutRedirect();
      notifyApiError(error);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAccessToken();
    } catch {
      forceLogoutRedirect();
      notifyApiError(error);
      return Promise.reject(error);
    }

    const token = useAuthStore.getState().accessToken;
    if (token) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
    }
    return api(originalRequest);
  },
);
