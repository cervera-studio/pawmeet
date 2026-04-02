import process from 'node:process';

/** Production origins allowed for CORS and WebSocket connections */
export const PRODUCTION_ORIGINS = [
  'https://pawmeet.io',
  'https://den.pawmeet.io',
  'https://pawmeet-admin.vercel.app',
] as const;

/** Development origins allowed for CORS and WebSocket connections */
export const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4321',
] as const;

/** Returns the appropriate allowed origins based on NODE_ENV */
export function getAllowedOrigins(): readonly string[] {
  return process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGINS : DEVELOPMENT_ORIGINS;
}
