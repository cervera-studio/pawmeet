import { cors } from 'hono/cors';

const PRODUCTION_ORIGINS = ['https://dogwalk.app', 'https://admin.dogwalk.app'];

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4321',
];

const allowedOrigins =
  process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGINS : DEVELOPMENT_ORIGINS;

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: true,
});
