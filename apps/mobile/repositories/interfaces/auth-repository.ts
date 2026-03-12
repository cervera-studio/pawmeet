import type { SafeUser, Serialized } from '@pawmeet/types';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: Serialized<SafeUser>;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthResult>;
  register(
    displayName: string,
    email: string,
    password: string,
    dateOfBirth: string,
  ): Promise<AuthResult>;
  socialLogin(
    provider: 'apple' | 'google',
    idToken: string,
    displayName?: string,
  ): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  getProfile(): Promise<Serialized<SafeUser>>;
  verifyEmail(email: string, code: string): Promise<{ message: string }>;
  resendVerificationEmail(email: string): Promise<{ message: string }>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(email: string, code: string, password: string): Promise<{ message: string }>;
}
