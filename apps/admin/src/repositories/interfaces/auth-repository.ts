import type { AdminUser } from '@/lib/auth';

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
}

export type LoginResponse = AuthResponse | MfaChallengeResponse;

export function isMfaChallenge(response: LoginResponse): response is MfaChallengeResponse {
  return 'mfaRequired' in response && response.mfaRequired === true;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<LoginResponse>;
  verifyMfa(mfaToken: string, code: string): Promise<AuthResponse>;
  refresh(): Promise<AuthResponse>;
  logout(): Promise<void>;
}
