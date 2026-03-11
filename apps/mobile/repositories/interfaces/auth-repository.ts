import type { SafeUser, Serialized } from '@dogwalk/types';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: Serialized<SafeUser>;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthResult>;
  register(displayName: string, email: string, password: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  getProfile(): Promise<{ user: Serialized<SafeUser> }>;
}
