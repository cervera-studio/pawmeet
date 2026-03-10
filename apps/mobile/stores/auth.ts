import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

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
