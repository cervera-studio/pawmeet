import { cors } from 'hono/cors';
import { getAllowedOrigins } from '../constants/origins.js';

export const corsMiddleware = cors({
  origin: [...getAllowedOrigins()],
  credentials: true,
});
