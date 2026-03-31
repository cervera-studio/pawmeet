import type { AppRouter } from '@pawmeet/api/trpc';
import type { TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';

export interface AuthRefreshCallbacks {
  getRefreshToken: () => Promise<string | null>;
  onTokensRefreshed: (accessToken: string, refreshToken: string) => Promise<void>;
  onRefreshFailed: () => void;
  onRefreshError?: (reason: string) => void;
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(apiUrl: string, callbacks: AuthRefreshCallbacks): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await callbacks.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${apiUrl}/trpc/auth.refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        callbacks.onRefreshError?.(`HTTP ${response.status} ${response.statusText}`);
        return false;
      }

      const data = (await response.json()) as {
        result?: { data?: { accessToken?: string; refreshToken?: string } };
      };
      const result = data.result?.data;
      if (!(result?.accessToken && result?.refreshToken)) return false;

      await callbacks.onTokensRefreshed(result.accessToken, result.refreshToken);
      return true;
    } catch (e) {
      callbacks.onRefreshError?.(`Exception: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'TRPCClientError') {
    const code = (error as { data?: Record<string, unknown> }).data?.code;
    return code === 'UNAUTHORIZED';
  }
  return false;
}

/**
 * tRPC link that intercepts UNAUTHORIZED errors, attempts a token refresh,
 * and retries the original request once. If refresh fails, calls onRefreshFailed.
 */
export function createAuthRefreshLink(
  apiUrl: string,
  callbacks: AuthRefreshCallbacks,
): TRPCLink<AppRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        let retried = false;

        function execute() {
          next(op).subscribe({
            next(value) {
              observer.next(value);
            },
            error(err) {
              if (isUnauthorizedError(err) && !retried) {
                retried = true;
                doRefresh(apiUrl, callbacks).then((success) => {
                  if (success) {
                    execute();
                  } else {
                    callbacks.onRefreshFailed();
                    observer.error(err);
                  }
                });
              } else {
                observer.error(err);
              }
            },
            complete() {
              observer.complete();
            },
          });
        }

        execute();
      });
    };
  };
}
