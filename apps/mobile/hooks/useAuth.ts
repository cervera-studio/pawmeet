import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { container } from 'tsyringe';
import { storage } from '@/lib/storage';
import type { AuthResult } from '@/repositories/interfaces/auth-repository';
import { AUTH_REPOSITORY } from '@/repositories/tokens';
import type { AuthUser } from '@/stores/auth';
import { useAuthStore } from '@/stores/auth';

const authRepo = container.resolve(AUTH_REPOSITORY);

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

async function persistAuthResult(result: AuthResult, storeLogin: AuthStore['login']) {
  await storage.setToken(result.accessToken);
  await storage.setRefreshToken(result.refreshToken);
  storeLogin(toAuthUser(result.user), result.accessToken, result.refreshToken);
}

type AuthStore = ReturnType<typeof useAuthStore.getState>;

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
      const result = await authRepo.login(email, password);
      await persistAuthResult(result, storeLogin);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      const result = await authRepo.register(displayName, email, password);
      await persistAuthResult(result, storeLogin);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const socialLogin = useCallback(
    async (provider: 'apple' | 'google', idToken: string, displayName?: string) => {
      const result = await authRepo.socialLogin(provider, idToken, displayName);
      await persistAuthResult(result, storeLogin);
      router.replace('/(tabs)');
    },
    [storeLogin, router],
  );

  const logout = useCallback(async () => {
    try {
      const rt = useAuthStore.getState().refreshToken;
      if (rt) await authRepo.logout(rt);
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
      const { user: profile } = await authRepo.getProfile();
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
    socialLogin,
    logout,
    checkAuth,
  };
}
