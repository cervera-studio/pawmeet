import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FAILED_ATTEMPTS } from '../constants/auth.js';

// In-memory Redis mock
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

describe('account-lockout', () => {
  let lockout: Awaited<typeof import('./account-lockout.js')>;

  beforeEach(async () => {
    store.clear();
    vi.resetModules();
    lockout = await import('./account-lockout.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('increments and returns attempt count', async () => {
      const service = lockout.createAccountLockout();
      const attempts = await service.recordFailedAttempt('user-1');
      expect(attempts).toBe(1);

      const attempts2 = await service.recordFailedAttempt('user-1');
      expect(attempts2).toBe(2);
    });
  });

  describe('isLocked', () => {
    it('returns false when under the limit', async () => {
      const service = lockout.createAccountLockout();
      expect(await service.isLocked('user-1')).toBe(false);
    });

    it('returns true when attempts reach the limit', async () => {
      const service = lockout.createAccountLockout();
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        await service.recordFailedAttempt('user-1');
      }
      expect(await service.isLocked('user-1')).toBe(true);
    });
  });

  describe('resetAttempts', () => {
    it('clears failed attempts', async () => {
      const service = lockout.createAccountLockout();
      await service.recordFailedAttempt('user-1');
      await service.recordFailedAttempt('user-1');
      await service.resetAttempts('user-1');
      expect(await service.isLocked('user-1')).toBe(false);
    });
  });
});
