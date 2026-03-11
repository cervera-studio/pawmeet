import type { Result } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { initTRPC, TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { verifyAccessToken } from '../lib/jwt.js';

export interface Context {
  userId: string | null;
  clientIp: string;
  [key: string]: unknown;
}

/** Create tRPC context from the incoming request. Extracts userId from Bearer token if present. */
export async function createContext(opts: { req: Request }): Promise<Context> {
  const clientIp =
    opts.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    opts.req.headers.get('x-real-ip') ??
    'unknown';

  const authHeader = opts.req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, clientIp };
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);
    return { userId: payload.sub, clientIp };
  } catch (e) {
    logger.warn('tRPC', 'Failed to verify access token in context', e);
    return { userId: null, clientIp };
  }
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Rate-limited public procedure for auth endpoints (10 req / 15 min) ──────
let _authRateLimiter: Ratelimit | null = null;

async function getAuthRateLimiter(): Promise<Ratelimit> {
  if (!_authRateLimiter) {
    const { redis } = await import('../lib/redis.js');
    _authRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15m'),
      prefix: 'rl:trpc:auth',
    });
  }
  return _authRateLimiter;
}

export const rateLimitedPublicProcedure = t.procedure.use(async ({ ctx, next }) => {
  const identifier = ctx.userId ?? ctx.clientIp;
  const limiter = await getAuthRateLimiter();
  const { success } = await limiter.limit(identifier);

  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Troppe richieste, riprova più tardi',
    });
  }

  return next();
});

/** Protected procedure — requires authenticated user. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
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
