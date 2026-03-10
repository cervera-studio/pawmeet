import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import type { AuthUser } from '@/stores/auth';
import { useAuthStore } from '@/stores/auth';

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export function useAuth() {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);
      storeLogin(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      const data = await api.post<AuthResponse>('/auth/register', {
        displayName,
        email,
        password,
      });
      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);
      storeLogin(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Continue with local logout even if API call fails
    }
    await storage.clear();
    storeLogout();
    router.replace('/(auth)/welcome');
  }, [storeLogout, router]);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const savedToken = await storage.getToken();
      if (!savedToken) {
        setLoading(false);
        return false;
      }
      useAuthStore.getState().setToken(savedToken);
      const savedRefreshToken = await storage.getRefreshToken();
      // Validate token by fetching user profile
      const user = await api.get<AuthUser>('/auth/me');
      storeLogin(user, savedToken, savedRefreshToken ?? '');
      return true;
    } catch {
      await storage.clear();
      storeLogout();
      return false;
    }
  }, [storeLogin, storeLogout, setLoading]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };
}
