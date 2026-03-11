import { createAuthRefreshLink } from '@dogwalk/api-client';
import { useAuthStore } from '@/stores/auth';
import { storage } from './storage';

export function createMobileAuthRefreshLink(apiUrl: string) {
  return createAuthRefreshLink(apiUrl, {
    getRefreshToken: () => storage.getRefreshToken(),
    async onTokensRefreshed(accessToken, refreshToken) {
      await storage.setToken(accessToken);
      await storage.setRefreshToken(refreshToken);
      useAuthStore.getState().setToken(accessToken);
    },
    onRefreshFailed() {
      storage.clear();
      useAuthStore.getState().logout();
    },
  });
}
