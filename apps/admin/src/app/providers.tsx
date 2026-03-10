'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/auth';
import {
  AuthContext,
  getTokenFromCookie,
  removeTokenCookie,
  setTokenCookie,
} from '@/lib/auth-store';
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

  // Initialize auth from cookie on mount
  // Uses REST client because /admin/auth/me is an admin-specific endpoint
  // not yet available in the tRPC router
  useEffect(() => {
    const token = getTokenFromCookie();
    if (token) {
      api.setToken(token);
      api
        .get<AdminUser>('/admin/auth/me')
        .then((u) => {
          setUser(u);
          setIsLoading(false);
        })
        .catch(() => {
          removeTokenCookie();
          api.setToken(null);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Uses REST client because /admin/auth/login is an admin-specific endpoint
  // not yet available in the tRPC router
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<{ user: AdminUser; token: string }>('/admin/auth/login', {
        email,
        password,
      });
      setTokenCookie(response.token);
      api.setToken(response.token);
      setUser(response.user);
      router.push('/');
    },
    [router],
  );

  const logout = useCallback(() => {
    removeTokenCookie();
    api.setToken(null);
    setUser(null);
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
