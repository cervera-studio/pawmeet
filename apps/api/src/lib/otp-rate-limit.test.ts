import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_OTP_ATTEMPTS } from '../constants/auth.js';

const store = new Map<string, unknown>();

vi.mock('./redis.js', () => ({
  redis: {
    incr: vi.fn(async (key: string) => {
      const current = (store.get(key) as number) ?? 0;
      store.set(key, current + 1);
      return current + 1;
    }),
    expire: vi.fn(async () => true),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) store.delete(k);
      return keys.length;
    }),
  },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('otp-rate-limit', () => {
  let mod: Awaited<typeof import('./otp-rate-limit.js')>;

  beforeEach(async () => {
    store.clear();
    vi.resetModules();
    mod = await import('./otp-rate-limit.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkOtpRateLimit', () => {
    it('allows attempts when under the limit', async () => {
      expect(await mod.checkOtpRateLimit('test@example.com')).toBe(true);
    });

    it('denies when attempts reach the limit', async () => {
      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        await mod.recordOtpAttempt('test@example.com');
      }
      expect(await mod.checkOtpRateLimit('test@example.com')).toBe(false);
    });

    it('normalizes email to lowercase', async () => {
      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        await mod.recordOtpAttempt('Test@Example.COM');
      }
      expect(await mod.checkOtpRateLimit('test@example.com')).toBe(false);
    });
  });

  describe('recordOtpAttempt', () => {
    it('increments attempt count', async () => {
      await mod.recordOtpAttempt('a@b.com');
      await mod.recordOtpAttempt('a@b.com');
      // After 2 attempts, still under limit (5)
      expect(await mod.checkOtpRateLimit('a@b.com')).toBe(true);
    });
  });

  describe('resetOtpAttempts', () => {
    it('clears attempts for an email', async () => {
      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        await mod.recordOtpAttempt('reset@test.com');
      }
      expect(await mod.checkOtpRateLimit('reset@test.com')).toBe(false);

      await mod.resetOtpAttempts('reset@test.com');
      expect(await mod.checkOtpRateLimit('reset@test.com')).toBe(true);
    });
  });
});
