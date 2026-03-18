import process from 'node:process';
import { createApiClient } from '@pawmeet/api-client';
import { useAuthStore } from '@/stores/auth';
import { createMobileAuthRefreshLink } from './auth-link';

function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!(url || __DEV__)) {
    throw new Error('EXPO_PUBLIC_API_URL is required in production');
  }
  return url ?? 'http://localhost:3000';
}

const API_URL = getApiUrl();

export const api = createApiClient(API_URL, () => useAuthStore.getState().token, [
  createMobileAuthRefreshLink(API_URL),
]);
