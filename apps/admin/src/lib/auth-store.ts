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

// Legacy cookie helpers — kept for backward compatibility with tRPC client config.
// The access token is now stored in memory, but the tRPC client may still call
// getTokenFromCookie during initialization before the refresh flow completes.
export function getTokenFromCookie(): string | null {
  // Access token is stored in memory, not in cookies.
  // Return null — the tRPC client should be updated to use the in-memory token.
  return null;
}

export function setTokenCookie(_token: string) {
  // No-op: access token is now stored in memory only
}

export function removeTokenCookie() {
  // No-op: refresh token cookie is managed by the server
}
