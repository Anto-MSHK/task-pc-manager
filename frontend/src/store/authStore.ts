import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import type { AuthResponse, TokenPair, User } from '../types/api';

interface JwtPayload {
  exp?: number;
  sub: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (response: AuthResponse) => void;
  setTokens: (tokens: TokenPair) => void;
  logout: () => void;
  /** Access JWT not expired (ignores refresh token). */
  isTokenValid: () => boolean;
  /** Can use the app: valid access JWT or refresh token present for silent rotation. */
  hasSession: () => boolean;
}

const ACCESS_TOKEN_KEY = 'pc_access_token';
const REFRESH_TOKEN_KEY = 'pc_refresh_token';
const USER_KEY = 'pc_user';

const parseStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: parseStoredUser(),
  setAuth: (response) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
  },
  setTokens: (tokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    set((state) => ({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: state.user,
    }));
  },
  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
  isTokenValid: () => {
    const token = get().accessToken;
    if (!token) {
      return false;
    }

    try {
      const payload = jwtDecode<JwtPayload>(token);
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
  hasSession: () => {
    const { accessToken, refreshToken } = get();
    if (refreshToken) {
      return true;
    }
    if (!accessToken) {
      return false;
    }
    try {
      const payload = jwtDecode<JwtPayload>(accessToken);
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
}));
