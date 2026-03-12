import { createTRPCClientConfig, trpc } from '@pawmeet/api-client';
import { getAccessToken } from './auth-store';

export { trpc };

export function getTRPCClientConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  return createTRPCClientConfig(baseUrl, () => getAccessToken());
}
