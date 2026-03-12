import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresAgeVerification: boolean;
  login: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  clearAgeVerification: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      requiresAgeVerification: false,

      login: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          requiresAgeVerification: user.dateOfBirth === null,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          requiresAgeVerification: false,
        }),

      setToken: (token) => set({ token }),

      setUser: (user) => set({ user, requiresAgeVerification: user.dateOfBirth === null }),

      setLoading: (isLoading) => set({ isLoading }),

      clearAgeVerification: () => set({ requiresAgeVerification: false }),
    }),
    {
      name: 'pawmeet-auth',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user profile data — tokens stay in SecureStore
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // MMKV is synchronous, so this fires immediately — mark loading done
        state?.setLoading(false);
      },
    },
  ),
);
