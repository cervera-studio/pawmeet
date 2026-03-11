import type { ApiClient } from '@dogwalk/api-client';
import type { AuthRepository, AuthResult } from '../interfaces';

export function createTrpcAuthRepository(api: ApiClient): AuthRepository {
  return {
    async login(email, password): Promise<AuthResult> {
      const result = await api.auth.login.mutate({ email, password });
      return result as AuthResult;
    },
    async register(displayName, email, password): Promise<AuthResult> {
      const result = await api.auth.register.mutate({ displayName, email, password });
      return result as AuthResult;
    },
    async logout(refreshToken): Promise<void> {
      await api.auth.logout.mutate({ refreshToken });
    },
    async getProfile() {
      const result = await api.users.getProfile.query();
      return result as Awaited<ReturnType<AuthRepository['getProfile']>>;
    },
  };
}
