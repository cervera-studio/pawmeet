'use client';

import { createContext, useContext } from 'react';
import type { AdminRole, AdminUser } from './auth';

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

// Cookie helpers
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )admin_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string) {
  document.cookie = `admin_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function removeTokenCookie() {
  document.cookie = 'admin_token=; path=/; max-age=0';
}
