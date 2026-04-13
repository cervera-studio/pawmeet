import process from 'node:process';
import { AppError, type Result } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { initTRPC, TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { verifyAccessToken, verifyAdminAccessToken } from '../lib/jwt.js';
import type { IntegrityVerdict } from '../ports/play-integrity-verifier.js';

/** Environment-namespaced prefix to prevent cross-env bleed when sharing Redis */
const ENV_PREFIX =
  process.env.NODE_ENV === 'production' ? 'rl:prod' : `rl:${process.env.NODE_ENV ?? 'dev'}`;

export interface Context {
  userId: string | null;
  clientIp: string;
  adminRole?: string;
  androidIntegrityToken?: string;
  [key: string]: unknown;
}

/** Create tRPC context from the incoming request. Extracts userId from Bearer token if present. */
export async function createContext(opts: { req: Request }): Promise<Context> {
  const clientIp =
    opts.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    opts.req.headers.get('x-real-ip') ??
    'unknown';

  const androidIntegrityToken = opts.req.headers.get('x-android-integrity-token') ?? undefined;

  const authHeader = opts.req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, clientIp, androidIntegrityToken };
  }

  const token = authHeader.slice(7);

  // Try user access token first
  try {
    const payload = await verifyAccessToken(token);
    return { userId: payload.sub, clientIp, androidIntegrityToken };
  } catch {
    // Not a user token — try admin token
  }

  try {
    const payload = await verifyAdminAccessToken(token);
    return { userId: payload.sub, clientIp, adminRole: payload.role, androidIntegrityToken };
  } catch {
    logger.warn('tRPC', 'Failed to verify access token in context');
    return { userId: null, clientIp, androidIntegrityToken };
  }
}

/**
 * Extract only field names from Zod errors — NEVER expose regex, min/max, or constraints.
 * Returns an array of field names that failed validation (e.g. ['email', 'password']).
 */
function extractZodFieldNames(shape: Record<string, unknown>): string[] {
  const zodError = shape.zodError as { fieldErrors?: Record<string, unknown> } | null | undefined;
  return Object.keys(zodError?.fieldErrors ?? {});
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    const isAppError = cause instanceof AppError;
    const hasZodError = error.code === 'BAD_REQUEST' && shape.data && 'zodError' in shape.data;

    return {
      ...shape,
      // Replace raw Zod JSON message with a generic string
      message: hasZodError ? 'Validation failed' : shape.message,
      data: {
        ...shape.data,
        // Expose machine-readable AppError code for client-side i18n mapping
        appCode: isAppError ? cause.code : undefined,
        appData: isAppError ? cause.data : undefined,
        // Only field names — no regex, no min/max, no constraints
        zodFieldErrors: hasZodError
          ? extractZodFieldNames(shape.data as Record<string, unknown>)
          : undefined,
        // Strip raw Zod error details from the response
        zodError: undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Rate-limited public procedures with per-action buckets ──────────────────

const rateLimiters: Record<string, Ratelimit> = {};

async function getRateLimiter(
  prefix: string,
  maxRequests: number,
  window: string,
): Promise<Ratelimit> {
  if (!rateLimiters[prefix]) {
    const { redis } = await import('../lib/redis.js');
    rateLimiters[prefix] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        maxRequests,
        window as Parameters<typeof Ratelimit.slidingWindow>[1],
      ),
      prefix,
    });
  }
  return rateLimiters[prefix];
}

function createRateLimitedProcedure(prefix: string, maxRequests: number, window: string) {
  return t.procedure.use(async ({ ctx, next }) => {
    const identifier = ctx.userId ?? ctx.clientIp;
    try {
      const limiter = await getRateLimiter(prefix, maxRequests, window);
      const { success } = await limiter.limit(identifier);
      if (!success) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again later',
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      // Fail-open: if Redis/Upstash is unreachable, allow the request through
      // rather than returning a 500. Rate limiting is a safety net, not a gate.
      logger.warn('tRPC', `Rate limiter unavailable (${prefix}), failing open`, err);
    }

    return next();
  });
}

/** General auth rate limit: 10 req / 15 min (login, social login) */
export const rateLimitedPublicProcedure = createRateLimitedProcedure(
  `${ENV_PREFIX}:trpc:auth`,
  10,
  '15m',
);

/** Strict rate limit for registration: 3 req / hour */
export const registerRateLimitedProcedure = createRateLimitedProcedure(
  `${ENV_PREFIX}:trpc:register`,
  3,
  '1h',
);

/** Higher rate limit for token refresh: 30 req / min (automated, multi-device) */
export const refreshRateLimitedProcedure = createRateLimitedProcedure(
  `${ENV_PREFIX}:trpc:refresh`,
  30,
  '1m',
);

/** Protected procedure — requires authenticated user. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  // Fire-and-forget: refresh user presence TTL on every authenticated call
  const uid = ctx.userId;
  if (uid) {
    void import('../lib/user-presence.js').then(({ markUserActive }) => markUserActive(uid));
  }

  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// ── Rate-limited protected procedure for GDPR export (3 req / 24h) ──────────
let _gdprExportRateLimiter: Ratelimit | null = null;

async function getGdprExportRateLimiter(): Promise<Ratelimit> {
  if (!_gdprExportRateLimiter) {
    const { redis } = await import('../lib/redis.js');
    _gdprExportRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '24h'),
      prefix: `${ENV_PREFIX}:trpc:gdpr-export`,
    });
  }
  return _gdprExportRateLimiter;
}

export const gdprExportProtectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  const limiter = await getGdprExportRateLimiter();
  const { success } = await limiter.limit(ctx.userId);

  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Daily export limit reached. Try again in 24 hours.',
    });
  }

  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// ── Integrity-verified procedure (Android Play Integrity) ─────────────────────

/**
 * Protected procedure that additionally requires a valid Android Play Integrity verdict.
 * The integrity token is verified lazily — only when this procedure type is used.
 * Falls back gracefully when the verifier is not configured (dev/staging).
 */
export const integrityVerifiedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  // Fire-and-forget presence update (same as protectedProcedure)
  const uid = ctx.userId;
  if (uid) {
    void import('../lib/user-presence.js').then(({ markUserActive }) => markUserActive(uid));
  }

  const { playIntegrityVerifier } = await import('../container/services.js');

  // Skip verification if the verifier is not configured (dev/staging)
  if (!playIntegrityVerifier) {
    return next({ ctx: { ...ctx, userId: ctx.userId, integrityVerdict: undefined } });
  }

  if (!ctx.androidIntegrityToken) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Device integrity verification required',
    });
  }

  let verdict: IntegrityVerdict;
  try {
    verdict = await playIntegrityVerifier.verify(ctx.androidIntegrityToken);
  } catch (err) {
    logger.warn('PlayIntegrity', 'Token verification failed', err);
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Device integrity verification failed',
    });
  }

  const deviceVerdicts = verdict.deviceIntegrity.deviceRecognitionVerdict;
  if (!deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')) {
    logger.warn('PlayIntegrity', `Device failed integrity: ${deviceVerdicts.join(', ')}`);
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Device integrity check did not pass',
    });
  }

  return next({ ctx: { ...ctx, userId: ctx.userId, integrityVerdict: verdict } });
});

/** Map HTTP status codes from AppError to tRPC error codes. */
function mapStatusToTRPCCode(status: number) {
  const map: Record<number, TRPCError['code']> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return map[status] ?? 'INTERNAL_SERVER_ERROR';
}

/** Unwrap a Result<T> into T or throw a TRPCError. */
export function unwrapResult<T>(result: Result<T>): T {
  if (result.success) return result.data;
  throw new TRPCError({
    code: mapStatusToTRPCCode(result.error.status),
    message: result.error.message,
    cause: result.error,
  });
}
