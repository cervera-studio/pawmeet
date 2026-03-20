import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { logger as appLogger } from '@pawmeet/utils';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { adminDeps, experimentService, onnxModelLoader, supportDeps } from './container/index.js';
import { chat, notificationService, supportRepo, userRepo } from './container/services.js';
import { registerDomainEventHandlers } from './domain/event-handlers.js';
import { initSentry, Sentry } from './lib/sentry.js';
import { analyticsCountersMiddleware } from './middleware/analytics-counters.js';
import { cacheControlMiddleware } from './middleware/cache-control.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { securityHeadersMiddleware } from './middleware/security-headers.js';

// Initialize Sentry before anything else
initSentry();

// Validate JWT secrets before anything else — fail fast if missing or too short
import { validateJwtSecrets } from './lib/jwt.js';
validateJwtSecrets();

import process from 'node:process';
import { createAdminAuthRoutes } from './routes/admin-auth.js';
import { analytics } from './routes/analytics.js';
import { createSupportRoutes } from './routes/support.js';
import { appRouter } from './trpc/root.js';
import { createContext } from './trpc/trpc.js';
import { setupWebSocket } from './ws/chat.js';

const app = new Hono();

app.use('*', logger());
app.use('*', securityHeadersMiddleware);
app.use('*', corsMiddleware);
app.use('/api/*', rateLimitMiddleware);
app.use('/trpc/*', rateLimitMiddleware);
app.use('/trpc/*', cacheControlMiddleware);
app.use('/trpc/*', analyticsCountersMiddleware);

/** Scrub PostgreSQL connection strings from error messages */
const PG_CONN_RE = /postgresql:\/\/[^\s]+@[^\s/]+\/[^\s]*/gi;
function redactConnectionStrings(message: string): string {
  return message.replace(PG_CONN_RE, 'postgresql://***@***/***');
}

// Global error handler — consistent JSON error responses
app.onError((err, c) => {
  const errorId = crypto.randomUUID().slice(0, 8);
  const safeMessage = redactConnectionStrings(err.message);
  appLogger.error('API', `[ERROR:${errorId}] ${c.req.method} ${c.req.url}: ${safeMessage}`);

  Sentry.withScope((scope) => {
    scope.setTag('errorId', errorId);
    scope.setExtra('method', c.req.method);
    scope.setExtra('url', c.req.url);
    Sentry.captureException(err);
  });

  // Zod validation errors return 400 — never expose raw details to client
  if (err.message.includes('Validation')) {
    return c.json({ error: 'Dati non validi', errorId }, 400);
  }

  return c.json({ error: 'Errore interno del server', errorId }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint non trovato' }, 404);
});

// tRPC endpoint — typed API for mobile and admin clients
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }));

// Analytics batch endpoint — raw Hono POST (not tRPC) for minimal overhead
app.route('/api/events', analytics);

// Admin auth routes — mounted at root level for the admin backoffice
app.route('/admin/auth', createAdminAuthRoutes(adminDeps));

// Support routes — public endpoint for guest ticket creation (web contact form)
app.route('/api/support', createSupportRoutes(supportDeps));

app.get('/health', async (c) => {
  const checks: Record<string, 'ok' | 'fail'> = {};

  // Database connectivity check
  try {
    const { db } = await import('./lib/db.js');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'fail';
  }

  // Redis connectivity check
  try {
    const { redis } = await import('./lib/redis.js');
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'fail';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');
  const status = allHealthy ? 'ok' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  return c.json({ status, timestamp: new Date().toISOString(), checks }, statusCode);
});

// Register domain event handlers (in-process pub/sub for side effects)
registerDomainEventHandlers({ chat, userRepo, notificationService, supportRepo });

const port = Number(process.env.PORT) || 3000;

// Initialize Statsig for A/B testing and feature flags
experimentService.initialize().then(() => {
  appLogger.info('API', 'Statsig experiment service ready');
});

// Initialize ONNX model loader for ML scoring (degrades gracefully if unavailable)
onnxModelLoader.initialize().then(() => {
  appLogger.info('API', `ONNX model loader ready (model loaded: ${onnxModelLoader.isReady()})`);
});

appLogger.info('API', `PawMeet API running on port ${port}`);

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });

// Attach WebSocket server to the HTTP server
setupWebSocket(server);

// Initialize Redis pub/sub for cross-server WebSocket relay (Fly.io multi-instance)
import('./ws/registry.js').then(({ initWsRedisSubscription }) => {
  initWsRedisSubscription().then(() => {
    appLogger.info('API', 'WebSocket Redis pub/sub relay initialized');
  });
});

// Start BullMQ workers in production
if (process.env.NODE_ENV === 'production') {
  import('./jobs/workers.js').then(({ startWorkers }) => {
    startWorkers();
    appLogger.info('API', 'BullMQ workers started');
  });
}

export default app;
