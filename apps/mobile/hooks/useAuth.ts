import { logger } from '@pawmeet/utils';
import { useCallback } from 'react';
import { container } from 'tsyringe';
import { storage } from '@/lib/storage';
import type { AuthResult } from '@/repositories/interfaces/auth-repository';
import { ANALYTICS_SERVICE, AUTH_REPOSITORY } from '@/repositories/tokens';
import type { AuthUser } from '@/stores/auth';
import { useAuthStore } from '@/stores/auth';
import { useConsentStore } from '@/stores/consent';

const authRepo = container.resolve(AUTH_REPOSITORY);
const analyticsService = container.resolve(ANALYTICS_SERVICE);

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    dateOfBirth: user.dateOfBirth,
  };
}

async function persistAuthResult(result: AuthResult, storeLogin: AuthStore['login']) {
  await storage.setToken(result.accessToken);
  await storage.setRefreshToken(result.refreshToken);
  storeLogin(toAuthUser(result.user), result.accessToken, result.refreshToken);

  // Initialize analytics for this user session
  analyticsService.identify(result.user.id);
  if (useConsentStore.getState().consents.analytics) {
    analyticsService.optIn();
  }
}

type AuthStore = ReturnType<typeof useAuthStore.getState>;

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
  } = useAuthStore();

  // Stack.Protected handles navigation automatically when isAuthenticated changes
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authRepo.login(email, password);
      await persistAuthResult(result, storeLogin);
    },
    [storeLogin],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string, dateOfBirth: string) => {
      const result = await authRepo.register(displayName, email, password, dateOfBirth);
      await persistAuthResult(result, storeLogin);
    },
    [storeLogin],
  );

  const socialLogin = useCallback(
    async (provider: 'apple' | 'google', idToken: string, displayName?: string) => {
      const result = await authRepo.socialLogin(provider, idToken, displayName);
      await persistAuthResult(result, storeLogin);
    },
    [storeLogin],
  );

  const logout = useCallback(async () => {
    try {
      await analyticsService.flush();
      analyticsService.reset();
    } catch (e) {
      logger.warn('useAuth', 'Analytics flush failed on logout', e);
    }

    try {
      const rt = useAuthStore.getState().refreshToken;
      if (rt) await authRepo.logout(rt);
    } catch (e) {
      logger.warn('useAuth', 'Server logout failed, continuing local logout', e);
    }
    await storage.clear();
    storeLogout();
  }, [storeLogout]);

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
      const profile = await authRepo.getProfile();
      storeLogin(toAuthUser(profile), savedToken, savedRefreshToken ?? '');

      analyticsService.identify(profile.id);
      if (useConsentStore.getState().consents.analytics) {
        analyticsService.optIn();
      }
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
