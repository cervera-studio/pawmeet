import { createAuthRefreshLink } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useAuthStore } from '@/stores/auth';
import { storage } from './storage';

export function createMobileAuthRefreshLink(apiUrl: string) {
  return createAuthRefreshLink(apiUrl, {
    async getRefreshToken() {
      const rt = await storage.getRefreshToken();
      logger.info(
        'AuthRefresh',
        rt ? 'Refresh token found in SecureStore' : 'NO refresh token in SecureStore',
      );
      return rt;
    },
    async onTokensRefreshed(accessToken, refreshToken) {
      logger.info('AuthRefresh', 'Tokens refreshed successfully');
      await storage.setToken(accessToken);
      await storage.setRefreshToken(refreshToken);
      useAuthStore.getState().setToken(accessToken);
    },
    onRefreshError(reason) {
      logger.warn('AuthRefresh', `Refresh error: ${reason}`);
    },
    onRefreshFailed() {
      logger.warn('AuthRefresh', 'Refresh FAILED — logging out');
      storage.clear();
      useAuthStore.getState().logout();
    },
  });
}
