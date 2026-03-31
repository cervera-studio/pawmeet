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
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresAgeVerification: boolean;
  onboardingCompleted: boolean;
  login: (user: AuthUser, token: string, onboardingCompleted: boolean) => void;
  logout: () => void;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  clearAgeVerification: () => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      requiresAgeVerification: false,
      onboardingCompleted: false,

      login: (user, token, onboardingCompleted) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          requiresAgeVerification: user.dateOfBirth === null,
          onboardingCompleted,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          requiresAgeVerification: false,
          onboardingCompleted: false,
        }),

      setToken: (token) => set({ token }),

      setUser: (user) => set({ user, requiresAgeVerification: user.dateOfBirth === null }),

      setLoading: (isLoading) => set({ isLoading }),

      clearAgeVerification: () => set({ requiresAgeVerification: false }),

      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    {
      name: 'pawmeet-auth',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user profile data — tokens stay in SecureStore
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
      onRehydrateStorage: () => (state) => {
        // MMKV is synchronous, so this fires immediately — mark loading done
        state?.setLoading(false);
      },
    },
  ),
);
