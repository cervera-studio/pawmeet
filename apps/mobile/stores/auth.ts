import type { RouterOutput } from '@dogwalk/api-client';
import { create } from 'zustand';

/** Subset of user fields needed in the auth store (from getProfile output). */
export type AuthUser = Pick<
  RouterOutput['users']['getProfile']['user'],
  'id' | 'email' | 'displayName' | 'avatarUrl'
>;

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token, refreshToken) =>
    set({
      user,
      token,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setToken: (token) => set({ token }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),
}));
