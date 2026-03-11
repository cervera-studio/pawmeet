import 'server-only';

import { type ApiClient, createApiClient } from '@dogwalk/api-client';
import { cookies } from 'next/headers';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Creates a tRPC client authenticated with the access token from the
 * same-origin HttpOnly cookie. Only usable in Server Components / Actions.
 */
export async function getServerTrpcClient(): Promise<ApiClient> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value ?? null;
  return createApiClient(baseUrl, () => token);
}

/**
 * Makes an authenticated REST call to the API from the server.
 * Used for endpoints that don't have tRPC procedures yet.
 */
export async function serverFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
