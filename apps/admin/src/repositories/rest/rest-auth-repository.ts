import type { AuthRepository, AuthResponse, LoginResponse } from '../interfaces';

/**
 * Auth repository that uses same-origin Next.js API routes as proxy.
 * The proxy handles cookie management (HttpOnly, same-origin) and
 * forwards requests to the actual API on Fly.io.
 *
 * This eliminates cross-origin cookie issues (SameSite, third-party blocking)
 * and enables future server-side data fetching.
 */
export function createRestAuthRepository(): AuthRepository {
  return {
    async login(email: string, password: string): Promise<LoginResponse> {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'Login failed');
      }

      const data: unknown = await response.json();
      return data as LoginResponse;
    },

    async verifyMfa(mfaToken: string, code: string): Promise<AuthResponse> {
      const response = await fetch('/api/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'MFA verification failed');
      }

      const data: unknown = await response.json();
      return data as AuthResponse;
    },

    async refresh(): Promise<AuthResponse> {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data: unknown = await response.json();
      return data as AuthResponse;
    },

    async logout(): Promise<void> {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
  };
}
