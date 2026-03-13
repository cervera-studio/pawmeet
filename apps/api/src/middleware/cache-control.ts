import type { MiddlewareHandler } from 'hono';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Sets Cache-Control headers based on HTTP method.
 * - GET/HEAD: short private cache with stale-while-revalidate for faster perceived loads
 * - Mutations: no-store to prevent caching of state-changing responses
 */
export const cacheControlMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  if (c.res.headers.has('Cache-Control')) return;

  if (SAFE_METHODS.has(c.req.method)) {
    c.header('Cache-Control', 'private, max-age=0, stale-while-revalidate=60');
  } else {
    c.header('Cache-Control', 'no-store');
  }
};
