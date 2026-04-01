import type { AppRouter } from '@pawmeet/api/trpc';
import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type { AuthRefreshCallbacks } from './auth-refresh-link';
export { createAuthRefreshLink } from './auth-refresh-link';
export type { AppRouter };

/** Inferred output types from every tRPC procedure — use instead of local types. */
export type RouterOutput = inferRouterOutputs<AppRouter>;

/** Inferred input types from every tRPC procedure. */
export type RouterInput = inferRouterInputs<AppRouter>;

/**
 * Vanilla tRPC client for all environments (React Native, Next.js server actions, scripts).
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
  extraHeaders?: () => Record<string, string>,
) {
  return createTRPCClient<AppRouter>({
    links: [
      ...(extraLinks ?? []),
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: () => {
          const token = getToken?.();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...extraHeaders?.(),
          };
        },
      }),
    ],
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
