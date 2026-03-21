'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/auth';
import { AuthContext, setAccessToken } from '@/lib/auth-store';
import { authRepository } from '@/repositories';
import { isMfaChallenge } from '@/repositories/interfaces/auth-repository';

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Stores the MFA pending token between login and verifyMfa */
  const mfaTokenRef = useRef<string | null>(null);

  useEffect(() => {
    authRepository
      .refresh()
      .then((response) => {
        setAccessToken(response.token);
        api.setToken(response.token);
        setUser(response.user);
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

    if (isMfaChallenge(response)) {
      mfaTokenRef.current = response.mfaToken;
      return 'mfa_required' as const;
    }

    setAccessToken(response.token);
    api.setToken(response.token);
    setUser(response.user);
    return;
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    const mfaToken = mfaTokenRef.current;
    if (!mfaToken) {
      throw new Error('No MFA token available');
    }

    const response = await authRepository.verifyMfa(mfaToken, code);
    mfaTokenRef.current = null;
    setAccessToken(response.token);
    api.setToken(response.token);
    setUser(response.user);
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
    mfaTokenRef.current = null;
    router.push('/login');
  }, [router]);

  const authValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      verifyMfa,
      logout,
    }),
    [user, isLoading, login, verifyMfa, logout],
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}
