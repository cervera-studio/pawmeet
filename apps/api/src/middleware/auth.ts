import type { MiddlewareHandler } from 'hono';
import { verifyAccessToken } from '../lib/jwt.js';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};
