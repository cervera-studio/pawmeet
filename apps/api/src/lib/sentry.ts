import { logger } from '@dogwalk/utils';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN ?? '';

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
    // Only send errors in production/staging, not during local dev
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') return null;
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
