import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { routes } from './routes/index.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/api', routes);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;

console.log(`🐕 DogWalk API running on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;
