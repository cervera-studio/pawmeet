import process from 'node:process';
import { Ratelimit } from '@upstash/ratelimit';
import type { MiddlewareHandler } from 'hono';

/** Environment-namespaced prefix to prevent cross-env bleed when sharing Redis */
const ENV_PREFIX =
  process.env.NODE_ENV === 'production' ? 'rl:prod' : `rl:${process.env.NODE_ENV ?? 'dev'}`;

/** Lazy-initialized Redis for rate limiting — avoids import-time crash in tests */
let _redis: InstanceType<typeof import('@upstash/redis').Redis> | null = null;
async function getRedis() {
  if (!_redis) {
    const { redis } = await import('../lib/redis.js');
    _redis = redis;
  }
  return _redis;
}

let _authLimiter: Ratelimit | null = null;
let _apiLimiter: Ratelimit | null = null;

let _passwordResetLimiter: Ratelimit | null = null;

async function getAuthLimiter(): Promise<Ratelimit> {
  if (!_authLimiter) {
    _authLimiter = new Ratelimit({
      redis: await getRedis(),
      limiter: Ratelimit.slidingWindow(10, '15m'),
      prefix: `${ENV_PREFIX}:auth`,
    });
  }
  return _authLimiter;
}

async function getApiLimiter(): Promise<Ratelimit> {
  if (!_apiLimiter) {
    _apiLimiter = new Ratelimit({
      redis: await getRedis(),
      limiter: Ratelimit.slidingWindow(100, '1m'),
      prefix: `${ENV_PREFIX}:api`,
    });
  }
  return _apiLimiter;
}

function getClientIp(c: Parameters<MiddlewareHandler>[0]): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown'
  );
}

function createRateLimitMiddleware(getLimiter: () => Promise<Ratelimit>): MiddlewareHandler {
  return async (c, next) => {
    const userId = c.get('userId') as string | undefined;
    const identifier = userId || getClientIp(c);

    const limiter = await getLimiter();
    const { success, remaining, reset } = await limiter.limit(identifier);

    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(reset));

    if (!success) {
      return c.json({ error: 'Troppe richieste, riprova più tardi' }, 429);
    }

    await next();
  };
}

/** Rate limit for auth endpoints: 10 requests per 15 minutes */
export const authRateLimitMiddleware = createRateLimitMiddleware(getAuthLimiter);

/** Rate limit for general API: 100 requests per minute */
export const rateLimitMiddleware = createRateLimitMiddleware(getApiLimiter);

async function getPasswordResetLimiter(): Promise<Ratelimit> {
  if (!_passwordResetLimiter) {
    _passwordResetLimiter = new Ratelimit({
      redis: await getRedis(),
      limiter: Ratelimit.slidingWindow(3, '1h'),
      prefix: `${ENV_PREFIX}:pwd-reset`,
    });
  }
  return _passwordResetLimiter;
}

/** Strict rate limit for password reset: 3 attempts per hour (per IP) */
export const passwordResetRateLimitMiddleware = createRateLimitMiddleware(getPasswordResetLimiter);

let _passwordResetEmailLimiter: Ratelimit | null = null;

async function getPasswordResetEmailLimiter(): Promise<Ratelimit> {
  if (!_passwordResetEmailLimiter) {
    _passwordResetEmailLimiter = new Ratelimit({
      redis: await getRedis(),
      limiter: Ratelimit.slidingWindow(3, '24h'),
      prefix: `${ENV_PREFIX}:pwd-reset-email`,
    });
  }
  return _passwordResetEmailLimiter;
}

/**
 * Per-email rate limit for password reset: 3 requests per email per 24 hours.
 * Must be applied AFTER body validation so `email` is available in the request.
 */
export const passwordResetEmailRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const body = await c.req.raw
    .clone()
    .json()
    .catch(() => null);
  const email = (body as { email?: string } | null)?.email;

  if (email) {
    const limiter = await getPasswordResetEmailLimiter();
    // Normalize email to lowercase to prevent bypass via casing
    const { success, remaining, reset } = await limiter.limit(email.toLowerCase());

    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(reset));

    if (!success) {
      return c.json(
        { error: 'Troppe richieste per questo indirizzo email, riprova più tardi' },
        429,
      );
    }
  }

  await next();
};

let _analyticsLimiter: Ratelimit | null = null;

async function getAnalyticsLimiter(): Promise<Ratelimit> {
  if (!_analyticsLimiter) {
    _analyticsLimiter = new Ratelimit({
      redis: await getRedis(),
      limiter: Ratelimit.slidingWindow(500, '1m'),
      prefix: `${ENV_PREFIX}:analytics`,
    });
  }
  return _analyticsLimiter;
}

/** Rate limit for analytics batch endpoint: 500 requests per minute */
export const analyticsRateLimitMiddleware = createRateLimitMiddleware(getAnalyticsLimiter);
