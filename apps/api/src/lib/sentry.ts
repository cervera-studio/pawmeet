import { logger } from '@pawmeet/utils';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN ?? '';

/** Fields that must never reach Sentry */
const PII_FIELDS = new Set([
  'email',
  'displayName',
  'display_name',
  'passwordHash',
  'password_hash',
  'pushToken',
  'push_token',
  'latitude',
  'longitude',
  'ip_address',
  'ipAddress',
  'phone',
  'phoneNumber',
  'phone_number',
  'message',
  'messageContent',
  'content',
  'dogName',
  'dog_name',
  'name',
  'description',
  'bio',
  'about',
  'avatar',
  'avatarUrl',
  'avatar_url',
  'photo',
  'photoUrl',
  'photo_url',
  'imageUrl',
  'image_url',
]);

/** Regex to match PostgreSQL connection strings */
const PG_CONNECTION_STRING_RE = /postgresql:\/\/[^\s]+@[^\s]+/gi;

/** Recursively strip PII fields from an object */
function scrubPii(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key)) {
      result[key] = '[Redacted]';
    } else if (typeof value === 'string' && PG_CONNECTION_STRING_RE.test(value)) {
      // Reset lastIndex since the regex is global
      PG_CONNECTION_STRING_RE.lastIndex = 0;
      result[key] = value.replace(PG_CONNECTION_STRING_RE, '[Redacted PG Connection]');
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = scrubPii(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function initSentry() {
  if (!dsn) {
    logger.warn('Sentry', 'SENTRY_DSN not set, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? undefined,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') return null;

      // Scrub PII from event contexts and extras
      if (event.contexts) {
        event.contexts = scrubPii(
          event.contexts as Record<string, unknown>,
        ) as typeof event.contexts;
      }
      if (event.extra) {
        event.extra = scrubPii(event.extra as Record<string, unknown>);
      }

      // Strip user context entirely for full GDPR anonymity.
      // Even a pseudonymized id could theoretically be correlated;
      // removing event.user makes all error reports fully anonymous.
      delete event.user;

      // Strip IP address
      if (event.request) {
        delete event.request.headers;
        delete (event.request as Record<string, unknown>).env;
      }

      return event;
    },
  });

  // Wire logger.warn/error to Sentry
  logger.onError((tag, msg, data) => {
    const error = data instanceof Error ? data : new Error(`[${tag}] ${msg}`);

    Sentry.withScope((scope) => {
      scope.setTag('logger.tag', tag);
      if (data !== undefined && !(data instanceof Error)) {
        scope.setExtra('data', data);
      }
      Sentry.captureException(error);
    });
  });

  logger.info('Sentry', 'Initialized');
}

export { Sentry };
