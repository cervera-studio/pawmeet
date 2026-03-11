import type { api as ApiClientInstance } from '@/lib/api';
import type { AdminUser } from '@/lib/auth';
import type { AuthRepository, AuthResponse } from '../interfaces';

type RestClient = typeof ApiClientInstance;

export function createRestAuthRepository(client: RestClient): AuthRepository {
  return {
    async login(email: string, password: string): Promise<AuthResponse> {
      return client.post<AuthResponse>('/admin/auth/login', { email, password });
    },
    async refresh(): Promise<AuthResponse> {
      return client.post<{ token: string; user: AdminUser }>('/admin/auth/refresh');
    },
    async logout(): Promise<void> {
      await client.post('/admin/auth/logout');
    },
  };
}
