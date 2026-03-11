import type { ApiClient } from '@dogwalk/api-client';
import type { AuthRepository, AuthResult } from '../interfaces';

export function createTrpcAuthRepository(api: ApiClient): AuthRepository {
  return {
    async login(email, password): Promise<AuthResult> {
      return api.auth.login.mutate({ email, password }) as Promise<AuthResult>;
    },
    async register(displayName, email, password): Promise<AuthResult> {
      return api.auth.register.mutate({ displayName, email, password }) as Promise<AuthResult>;
    },
    async socialLogin(provider, idToken, displayName): Promise<AuthResult> {
      return api.auth.socialLogin.mutate({ provider, idToken, displayName }) as Promise<AuthResult>;
    },
    async logout(refreshToken): Promise<void> {
      await api.auth.logout.mutate({ refreshToken });
    },
    async getProfile() {
      const result = await api.users.getProfile.query();
      return result as Awaited<ReturnType<AuthRepository['getProfile']>>;
    },
    async verifyEmail(email, code) {
      const result = await api.auth.verifyEmailOtp.mutate({ email, code });
      return result as { message: string };
    },
    async resendVerificationEmail(email) {
      const result = await api.auth.resendVerification.mutate({ email });
      return result as { message: string };
    },
    async forgotPassword(email) {
      await api.auth.forgotPassword.mutate({ email });
      return { message: 'ok' };
    },
    async resetPassword(_email, _code, _password) {
      // TODO: Phase D — wire to api.auth.resetPasswordOtp.mutate() once backend procedure exists
      throw new Error('Password reset OTP not yet implemented');
    },
  };
}
