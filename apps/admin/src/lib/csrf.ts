import process from 'node:process';

const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? '';

/**
 * Validates that the request origin matches the expected admin origin.
 * Prevents CSRF attacks on unauthenticated auth endpoints that accept JSON bodies.
 *
 * Returns `true` if the origin is valid, `false` otherwise.
 * In development (no ADMIN_URL configured), the check is skipped.
 */
export function isValidOrigin(request: Request): boolean {
  // Fail-closed in production; skip only in development when no admin URL is configured
  if (!ADMIN_ORIGIN) {
    return process.env.NODE_ENV !== 'production';
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const check = origin ?? referer ?? '';

  try {
    const checkUrl = new URL(check);
    const adminUrl = new URL(ADMIN_ORIGIN);
    return checkUrl.origin === adminUrl.origin;
  } catch {
    return false;
  }
}
