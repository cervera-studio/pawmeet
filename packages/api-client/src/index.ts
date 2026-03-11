import type { AppRouter } from '@dogwalk/api/trpc';
import { type TRPCLink, createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type { AppRouter };
export { createAuthRefreshLink } from './auth-refresh-link.js';
export type { AuthRefreshCallbacks } from './auth-refresh-link.js';

/** Inferred output types from every tRPC procedure — use instead of local types. */
export type RouterOutput = inferRouterOutputs<AppRouter>;

/** Inferred input types from every tRPC procedure. */
export type RouterInput = inferRouterInputs<AppRouter>;

/**
 * Vanilla tRPC client for non-React environments (React Native, scripts).
 * Provides full type inference from the API router.
 *
 * @example
 * ```ts
 * const api = createApiClient('http://localhost:3000', getToken);
 * const { user, accessToken } = await api.auth.register.mutate({ email, password, displayName });
 * const { dogs } = await api.dogs.list.query();
 * ```
 */
export function createApiClient(
  baseUrl: string,
  getToken?: () => string | null,
  extraLinks?: TRPCLink<AppRouter>[],
) {
  return createTRPCClient<AppRouter>({
    links: [
      ...(extraLinks ?? []),
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: () => {
          const token = getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * React tRPC hooks for Next.js / React Query environments.
 * Use with `trpc.Provider` wrapping your app.
 *
 * @example
 * ```tsx
 * // In providers.tsx
 * import { trpc, createTRPCClientConfig } from '@dogwalk/api-client';
 * const trpcClient = trpc.createClient(createTRPCClientConfig('http://localhost:3000', getToken));
 *
 * // In components
 * const { data } = trpc.dogs.list.useQuery();
 * const mutation = trpc.auth.login.useMutation();
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();

/** Create tRPC client configuration for React Query integration. */
export function createTRPCClientConfig(baseUrl: string, getToken?: () => string | null) {
  return {
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: () => {
          const token = getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  };
}
