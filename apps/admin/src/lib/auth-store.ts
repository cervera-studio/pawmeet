'use client';

import { createContext, useContext } from 'react';
import type { AdminUser } from './auth';

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

/**
 * Check if the admin_refresh_token cookie exists.
 * This is used by the Next.js middleware for a lightweight auth check.
 * The actual token is HttpOnly so we only check for a presence indicator.
 */
export function hasRefreshCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('admin_refresh_token');
}

// Module-level in-memory token holder.
// Shared between the auth provider (writes) and the tRPC client config (reads).
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}
