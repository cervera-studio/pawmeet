import type { ApiClient } from '@pawmeet/api-client';
import type { AuthRepository } from '../interfaces';

export function createTrpcAuthRepository(api: ApiClient): AuthRepository {
  return {
    async login(email, password) {
      return api.auth.login.mutate({ email, password });
    },
    async register(displayName, email, password, dateOfBirth) {
      return api.auth.register.mutate({
        displayName,
        email,
        password,
        dateOfBirth,
      });
    },
    async socialLogin(provider, idToken, displayName, code, codeVerifier, redirectUri) {
      return api.auth.socialLogin.mutate({
        provider,
        idToken,
        displayName,
        code,
        codeVerifier,
        redirectUri,
      });
    },
    async logout(refreshToken) {
      await api.auth.logout.mutate({ refreshToken });
    },
    async getProfile() {
      return api.users.getProfile.query();
    },
    async verifyEmail(email, code) {
      return api.auth.verifyEmailOtp.mutate({ email, code });
    },
    async resendVerificationEmail(email) {
      return api.auth.resendVerification.mutate({ email });
    },
    async forgotPassword(email) {
      await api.auth.forgotPassword.mutate({ email });
      return { message: 'ok' };
    },
    async resetPassword(email, code, password) {
      return api.auth.resetPassword.mutate({ email, code, password });
    },
  };
}
