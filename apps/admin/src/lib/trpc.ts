import { createTRPCClientConfig, trpc } from '@dogwalk/api-client';
import { getTokenFromCookie } from './auth-store';

export { trpc };

export function getTRPCClientConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  return createTRPCClientConfig(baseUrl, () => getTokenFromCookie() ?? null);
}
