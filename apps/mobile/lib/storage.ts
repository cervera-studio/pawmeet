import { logger } from '@pawmeet/utils';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const TOKEN_KEY = 'pawmeet_auth_token';
const REFRESH_TOKEN_KEY = 'pawmeet_refresh_token';
const MMKV_ENCRYPTION_KEY = 'pawmeet_mmkv_enc_key';
const HAS_REGISTERED_PASSKEY_KEY = 'has_registered_passkey';

// ---------------------------------------------------------------------------
// MMKV — fast synchronous key-value storage for caching & Zustand persistence
// ---------------------------------------------------------------------------

function getOrCreateEncryptionKey(): string {
  const existing = SecureStore.getItem(MMKV_ENCRYPTION_KEY);
  if (existing) return existing;

  const key = Array.from(Crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  SecureStore.setItem(MMKV_ENCRYPTION_KEY, key);
  return key;
}

export const mmkv = createMMKV({ id: 'pawmeet', encryptionKey: getOrCreateEncryptionKey() });

/** Type-safe JSON cache helpers built on top of MMKV. */
export const cache = {
  get<T>(key: string): T | null {
    const value = mmkv.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    mmkv.set(key, JSON.stringify(value));
  },
  delete(key: string): void {
    mmkv.remove(key);
  },
};

/** Passkey registration flag — synchronous MMKV helpers. */
export const passkeyFlag = {
  get(): boolean {
    return mmkv.getBoolean(HAS_REGISTERED_PASSKEY_KEY) === true;
  },
  set(value: boolean): void {
    mmkv.set(HAS_REGISTERED_PASSKEY_KEY, value);
  },
  clear(): void {
    mmkv.remove(HAS_REGISTERED_PASSKEY_KEY);
  },
};

/** Zustand-compatible StateStorage adapter backed by MMKV (synchronous). */
export const mmkvStorage = {
  getItem: (name: string): string | null => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => {
    mmkv.remove(name);
  },
} satisfies StateStorage;

// ---------------------------------------------------------------------------
// SecureStore — encrypted storage for auth tokens (unchanged)
// ---------------------------------------------------------------------------

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
      logger.warn('Storage', 'SecureStore non disponibile');
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      logger.warn('Storage', 'SecureStore non disponibile');
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
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
        requireAuthentication: true,
      });
    } catch {
      logger.warn('Storage', 'SecureStore non disponibile');
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      logger.warn('Storage', 'SecureStore non disponibile');
    }
  },

  async clear(): Promise<void> {
    await Promise.all([this.removeToken(), this.removeRefreshToken()]);
  },
};
