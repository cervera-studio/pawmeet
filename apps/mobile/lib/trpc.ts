import { createApiClient } from '@pawmeet/api-client';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { useIntegrityStore } from '@/stores/integrity';
import { createMobileAuthRefreshLink } from './auth-link';

function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!(url || __DEV__)) {
    throw new Error('EXPO_PUBLIC_API_URL is required in production');
  }
  return url ?? 'http://localhost:3000';
}

const API_URL = getApiUrl();

export const api = createApiClient(
  API_URL,
  () => useAuthStore.getState().token,
  [createMobileAuthRefreshLink(API_URL)],
  (): Record<string, string> => {
    if (Platform.OS !== 'android') return {};
    const token = useIntegrityStore.getState().token;
    if (!token) return {};
    return { 'x-android-integrity-token': token };
  },
);
