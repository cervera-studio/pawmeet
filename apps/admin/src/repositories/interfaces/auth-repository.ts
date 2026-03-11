import type { AdminUser } from '@/lib/auth';

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
  refresh(): Promise<AuthResponse>;
  logout(): Promise<void>;
}
