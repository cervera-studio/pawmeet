import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'dogwalk_auth_token';
const REFRESH_TOKEN_KEY = 'dogwalk_refresh_token';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // Fallback silenzioso in dev
      console.warn('SecureStore non disponibile');
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      console.warn('SecureStore non disponibile');
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch {
      console.warn('SecureStore non disponibile');
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      console.warn('SecureStore non disponibile');
    }
  },

  async clear(): Promise<void> {
    await Promise.all([this.removeToken(), this.removeRefreshToken()]);
  },
};
