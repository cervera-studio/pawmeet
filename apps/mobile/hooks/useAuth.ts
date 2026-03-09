import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { storage } from '@/lib/storage';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        // TODO: chiamata API login
        const mockUser = { id: '1', email, name: 'Utente' };
        const mockToken = 'mock-token';

        await storage.setToken(mockToken);
        storeLogin(mockUser, mockToken);
        router.replace('/(tabs)');
      } catch (error) {
        throw error;
      }
    },
    [storeLogin, router],
  );

  const logout = useCallback(async () => {
    await storage.removeToken();
    storeLogout();
    router.replace('/(auth)/welcome');
  }, [storeLogout, router]);

  const checkAuth = useCallback(async () => {
    const savedToken = await storage.getToken();
    if (savedToken) {
      // TODO: validare token con API
      return true;
    }
    return false;
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };
}
