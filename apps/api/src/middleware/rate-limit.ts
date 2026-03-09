import type { MiddlewareHandler } from 'hono';
// TODO: implement with @upstash/ratelimit

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // TODO: implement rate limiting with Upstash Redis
  await next();
};
