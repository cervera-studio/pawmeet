'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/auth';
import { AuthContext } from '@/lib/auth-store';
import { getTRPCClientConfig, trpc } from '@/lib/trpc';

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => trpc.createClient(getTRPCClientConfig()));

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store access token in memory only (not localStorage, not cookies)
  const accessTokenRef = useRef<string | null>(null);

  // On mount, try to refresh the session via HttpOnly refresh cookie
  useEffect(() => {
    api
      .post<{ token: string; user: AdminUser }>('/admin/auth/refresh')
      .then((response) => {
        accessTokenRef.current = response.token;
        api.setToken(response.token);
        setUser(response.user);
        document.cookie = 'admin_session=1; path=/; max-age=28800; SameSite=Lax';
        setIsLoading(false);
      })
      .catch(() => {
        accessTokenRef.current = null;
        api.setToken(null);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<{ user: AdminUser; token: string }>('/admin/auth/login', {
        email,
        password,
      });
      accessTokenRef.current = response.token;
      api.setToken(response.token);
      setUser(response.user);
      // Set session indicator cookie so the middleware can gate access server-side
      document.cookie = 'admin_session=1; path=/; max-age=28800; SameSite=Lax';
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    accessTokenRef.current = null;
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

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
