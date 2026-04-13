import * as Sentry from '@sentry/react-native';
import i18n from '@/lib/i18n';
import { isOnline } from '@/lib/network';

/** Duck-type check for TRPCClientError without importing @trpc/client. */
export function isTRPCClientError(error: unknown): error is Error & { data?: unknown } {
  return (
    error instanceof Error &&
    'data' in error &&
    typeof (error as Record<string, unknown>).data === 'object'
  );
}

/**
 * Structured, user-safe error result.
 * View models use `message` for banner display and `fieldErrors` for inline field hints.
 */
export interface AppErrorResult {
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly isRetryable: boolean;
}

/** Maps tRPC error codes → generic i18n keys. */
const TRPC_CODE_I18N = {
  BAD_REQUEST: 'errors.badRequest',
  UNAUTHORIZED: 'errors.sessionExpired',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.notFound',
  CONFLICT: 'errors.conflict',
  TOO_MANY_REQUESTS: 'errors.rateLimited',
  TIMEOUT: 'errors.timeout',
  INTERNAL_SERVER_ERROR: 'errors.server',
  PRECONDITION_FAILED: 'errors.preconditionFailed',
  METHOD_NOT_SUPPORTED: 'errors.server',
  CLIENT_CLOSED_REQUEST: 'errors.network',
  PARSE_ERROR: 'errors.badRequest',
  UNPROCESSABLE_CONTENT: 'errors.badRequest',
} as const;

/** Maps AppError.code → specific i18n keys. Extend as new codes are added. */
const APP_CODE_I18N: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'errors.auth.invalidCredentials',
  AUTH_ACCOUNT_DISABLED: 'errors.auth.accountDisabled',
  AUTH_ACCOUNT_LOCKED: 'errors.auth.accountLocked',
  AUTH_EMAIL_TAKEN: 'errors.auth.emailTaken',
  AUTH_INVALID_TOKEN: 'errors.auth.invalidToken',
  AUTH_RATE_LIMITED: 'errors.rateLimited',
  SWIPE_LIMIT_REACHED: 'errors.swipeLimitReached',
  PASSKEY_CHALLENGE_EXPIRED: 'errors.passkey.challengeExpired',
  PASSKEY_VERIFICATION_FAILED: 'errors.passkey.verificationFailed',
  PASSKEY_LIMIT_REACHED: 'errors.passkey.limitReached',
  PASSKEY_NOT_FOUND: 'errors.passkey.notFound',
  PASSKEY_LAST_AUTH_METHOD: 'errors.passkey.lastAuthMethod',
};

const RETRYABLE_CODES = new Set([
  'TIMEOUT',
  'INTERNAL_SERVER_ERROR',
  'TOO_MANY_REQUESTS',
  'CLIENT_CLOSED_REQUEST',
]);

/**
 * Extract a safe, user-facing error from any caught value.
 * NEVER exposes raw error messages, Zod internals, or server details to the user.
 *
 * @param error  - The caught value (unknown)
 * @param context - Sentry breadcrumb tag (e.g. 'login', 'editDog')
 */
export function handleApiError(error: unknown, context: string): AppErrorResult {
  // 1. Offline — no need to log to Sentry
  if (!isOnline()) {
    return { message: i18n.t('errors.offline'), fieldErrors: {}, isRetryable: true };
  }

  // 2. Network-level failures (DNS, TLS, fetch abort)
  if (isNetworkError(error)) {
    logToSentry(error, context, 'warning');
    return { message: i18n.t('errors.network'), fieldErrors: {}, isRetryable: true };
  }

  // 3. tRPC errors — the main case
  if (isTRPCClientError(error)) {
    logToSentry(error, context, 'error');

    const trpcCode = extractTrpcCode(error);
    const appCode = extractAppCode(error);
    const fieldErrors = extractFieldErrors(error);
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    // Priority: appCode i18n → trpcCode i18n → unknown
    let messageKey: string;
    if (appCode && APP_CODE_I18N[appCode]) {
      messageKey = APP_CODE_I18N[appCode];
    } else if (hasFieldErrors) {
      messageKey = 'errors.validationFields';
    } else {
      messageKey = TRPC_CODE_I18N[trpcCode as keyof typeof TRPC_CODE_I18N] ?? 'errors.unknown';
    }

    return {
      message: i18n.t(messageKey),
      fieldErrors,
      isRetryable: RETRYABLE_CODES.has(trpcCode),
    };
  }

  // 4. HTTP errors from non-tRPC-shaped responses (e.g. Hono global onError
  //    returning { error, errorId } on 5xx) — surface a server error instead of "unknown".
  if (isHttpServerError(error)) {
    logToSentry(error, context, 'error');
    return { message: i18n.t('errors.server'), fieldErrors: {}, isRetryable: true };
  }

  // 5. Unknown errors — never expose raw message
  logToSentry(error, context, 'error');
  return { message: i18n.t('errors.unknown'), fieldErrors: {}, isRetryable: false };
}

function isHttpServerError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return /\b5\d{2}\b/.test(msg) || msg.toLowerCase().includes('internal server error');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safely access `.data` from a TRPCClientError (typed as Record for flexibility). */
function getTrpcData(error: { data?: unknown }): Record<string, unknown> | undefined {
  const data = error.data;
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
}

function extractTrpcCode(error: { data?: unknown }): string {
  const data = getTrpcData(error);
  return typeof data?.code === 'string' ? data.code : 'INTERNAL_SERVER_ERROR';
}

function extractAppCode(error: { data?: unknown }): string | undefined {
  const data = getTrpcData(error);
  return typeof data?.appCode === 'string' ? data.appCode : undefined;
}

function extractFieldErrors(error: { data?: unknown }): Record<string, string> {
  const data = getTrpcData(error);
  const fieldNames = data?.zodFieldErrors;
  if (!Array.isArray(fieldNames)) return {};

  const fieldErrors: Record<string, string> = {};
  for (const name of fieldNames) {
    if (typeof name === 'string') {
      fieldErrors[name] = i18n.t('errors.invalidField');
    }
  }
  return fieldErrors;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('econnrefused') ||
    msg.includes('network error')
  );
}

function logToSentry(error: unknown, context: string, level: 'warning' | 'error'): void {
  Sentry.withScope((scope) => {
    scope.setTag('errorContext', context);
    scope.setLevel(level);

    if (isTRPCClientError(error)) {
      scope.setExtra('trpcCode', extractTrpcCode(error));
      scope.setExtra('appCode', extractAppCode(error));
      scope.setExtra('rawMessage', error.message);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`Non-Error thrown in ${context}: ${String(error)}`);
    }
  });
}
