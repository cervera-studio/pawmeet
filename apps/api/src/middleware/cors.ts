import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4321',
    'https://dogwalk.app',
    'https://admin.dogwalk.app',
  ],
  credentials: true,
});
