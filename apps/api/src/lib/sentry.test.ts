import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSentryInit, mockLogger } = vi.hoisted(() => ({
  mockSentryInit: vi.fn(),
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    onError: vi.fn(),
  },
}));

vi.mock('@sentry/node', () => ({
  init: mockSentryInit,
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@pawmeet/utils', () => ({
  logger: mockLogger,
}));

describe('sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSentryInit.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initSentry', () => {
    it('does not call Sentry.init when SENTRY_DSN is not set', async () => {
      vi.stubEnv('SENTRY_DSN', '');
      const { initSentry } = await import('./sentry.js');

      initSentry();

      expect(mockSentryInit).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Sentry',
        'SENTRY_DSN not set, error tracking disabled',
      );
    });

    it('calls Sentry.init with DSN and environment when configured', async () => {
      vi.stubEnv('SENTRY_DSN', 'https://key@sentry.io/123');
      vi.stubEnv('NODE_ENV', 'production');
      const { initSentry } = await import('./sentry.js');

      initSentry();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://key@sentry.io/123',
          environment: 'production',
          tracesSampleRate: 0.2,
        }),
      );
    });

    it('uses 1.0 tracesSampleRate in development', async () => {
      vi.stubEnv('SENTRY_DSN', 'https://key@sentry.io/123');
      vi.stubEnv('NODE_ENV', 'development');
      const { initSentry } = await import('./sentry.js');

      initSentry();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        }),
      );
    });

    it('registers logger.onError callback', async () => {
      vi.stubEnv('SENTRY_DSN', 'https://key@sentry.io/123');
      const { initSentry } = await import('./sentry.js');

      initSentry();

      expect(mockLogger.onError).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
