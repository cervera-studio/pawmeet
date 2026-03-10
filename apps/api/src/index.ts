import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { routes } from './routes/index.js';
import { appRouter } from './trpc/root.js';
import { createContext } from './trpc/trpc.js';
import { setupWebSocket } from './ws/chat.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Global error handler — consistent JSON error responses
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.url}:`, err.message);

  // Zod validation errors return 400
  if (err.message.includes('Validation')) {
    return c.json({ error: 'Dati non validi', details: err.message }, 400);
  }

  return c.json({ error: 'Errore interno del server' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint non trovato' }, 404);
});

// tRPC endpoint — typed API for mobile and admin clients
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }));

// REST API — kept for backwards compatibility (to be removed)
app.route('/api', routes);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;

console.log(`DogWalk API running on port ${port}`);

const server = serve({ fetch: app.fetch, port }) as unknown as Server;

// Attach WebSocket server to the HTTP server
setupWebSocket(server);

// Start BullMQ workers in production
if (process.env.NODE_ENV === 'production') {
  import('./jobs/workers.js').then(({ startWorkers }) => {
    startWorkers();
    console.log('BullMQ workers started');
  });
}

export default app;
