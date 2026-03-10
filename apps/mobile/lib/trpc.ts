import { createApiClient } from '@dogwalk/api-client';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = createApiClient(API_URL, () => useAuthStore.getState().token);
