import { ANALYTICS_BATCH_MAX_BODY_BYTES } from '@dogwalk/config';
import { batchEventsSchema } from '@dogwalk/validation';
import { Hono } from 'hono';
import { enqueueAnalyticsEvents } from '../jobs/queue.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { analyticsRateLimitMiddleware } from '../middleware/rate-limit.js';

const analytics = new Hono();

analytics.use('*', analyticsRateLimitMiddleware);

analytics.post('/batch', async (c) => {
  // Extract userId from Bearer token (optional — unauthenticated events allowed)
  let userId: string | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.sub;
    } catch {
      // Invalid token — proceed without userId
    }
  }

  // Check body size
  const contentLength = Number(c.req.header('Content-Length') ?? 0);
  if (contentLength > ANALYTICS_BATCH_MAX_BODY_BYTES) {
    return c.json({ error: 'Body troppo grande' }, 413);
  }

  const body = await c.req.json();
  const parsed = batchEventsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dati non validi', details: parsed.error.issues }, 400);
  }

  const events = parsed.data.events.map((e) => ({
    ...e,
    userId,
    properties: e.properties as Record<string, unknown> | undefined,
  }));

  await enqueueAnalyticsEvents({ events });

  return c.json({ accepted: events.length }, 202);
});

export { analytics };
