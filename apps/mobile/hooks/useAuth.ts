import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { storage } from '@/lib/storage';
import { api } from '@/lib/trpc';
import type { AuthUser } from '@/stores/auth';
import { useAuthStore } from '@/stores/auth';

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
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
      const data = await api.auth.login.mutate({ email, password });
      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);
      storeLogin(toAuthUser(data.user), data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      const data = await api.auth.register.mutate({
        displayName,
        email,
        password,
      });
      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);
      storeLogin(toAuthUser(data.user), data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const logout = useCallback(async () => {
    try {
      const rt = useAuthStore.getState().refreshToken;
      if (rt) await api.auth.logout.mutate({ refreshToken: rt });
    } catch (e) {
      logger.warn('useAuth', 'Server logout failed, continuing local logout', e);
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
      const { user: profile } = await api.users.getProfile.query();
      storeLogin(toAuthUser(profile), savedToken, savedRefreshToken ?? '');
      return true;
    } catch (e) {
      logger.warn('useAuth', 'Auth check failed, clearing session', e);
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
