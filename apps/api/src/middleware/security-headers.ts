import type { MiddlewareHandler } from 'hono';

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const API_DOMAIN = process.env.API_DOMAIN || '';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  `img-src 'self' ${R2_PUBLIC_URL} https://*.r2.cloudflarestorage.com`,
  `media-src 'self' ${R2_PUBLIC_URL} https://*.r2.cloudflarestorage.com`,
  `connect-src 'self' ${API_DOMAIN} https://accounts.google.com https://appleid.apple.com`,
  "script-src 'self'",
  "style-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .filter(Boolean)
  .join('; ');

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
].join(', ');

/** Add security headers to all responses */
export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '0');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', PERMISSIONS_POLICY);
  c.header('Content-Security-Policy', CSP_DIRECTIVES);

  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
};
