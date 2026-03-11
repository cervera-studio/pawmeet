'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/auth';
import { AuthContext, setAccessToken } from '@/lib/auth-store';
import { authRepository } from '@/repositories';

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authRepository
      .refresh()
      .then((response) => {
        setAccessToken(response.token);
        api.setToken(response.token);
        setUser(response.user);
        document.cookie = 'admin_session=1; path=/; max-age=28800; SameSite=Lax';
        setIsLoading(false);
      })
      .catch(() => {
        setAccessToken(null);
        api.setToken(null);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authRepository.login(email, password);
    setAccessToken(response.token);
    api.setToken(response.token);
    setUser(response.user);
    document.cookie = 'admin_session=1; path=/; max-age=28800; SameSite=Lax';
  }, []);

  const logout = useCallback(async () => {
    try {
      await authRepository.logout();
    } catch {
      // Ignore errors during logout
    }
    setAccessToken(null);
    api.setToken(null);
    setUser(null);
    document.cookie = 'admin_session=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  const authValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}
