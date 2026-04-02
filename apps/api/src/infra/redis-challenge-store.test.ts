import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/config', () => ({
  WEBAUTHN_CHALLENGE_TTL_SECONDS: 300,
}));

import type { RedisChallengeStore as RedisChallengeStoreType } from './redis-challenge-store.js';

interface RedisLike {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
}

function buildRedis(overrides: Partial<RedisLike> = {}): RedisLike {
  return {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

describe('RedisChallengeStore', () => {
  let redis: RedisLike;
  let store: RedisChallengeStoreType;

  beforeEach(async () => {
    vi.clearAllMocks();
    redis = buildRedis();
    const { RedisChallengeStore } = await import('./redis-challenge-store.js');
    store = new RedisChallengeStore(redis);
  });

  describe('set', () => {
    it('stores challenge with prefixed key and TTL', async () => {
      await store.set('user-1', 'abc123');

      expect(redis.set).toHaveBeenCalledWith('webauthn:challenge:user-1', 'abc123', { ex: 300 });
    });
  });

  describe('get', () => {
    it('returns challenge when it exists', async () => {
      redis.get.mockResolvedValue('abc123');

      const result = await store.get('user-1');

      expect(result).toBe('abc123');
      expect(redis.get).toHaveBeenCalledWith('webauthn:challenge:user-1');
    });

    it('returns null when challenge does not exist', async () => {
      redis.get.mockResolvedValue(null);

      const result = await store.get('user-1');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('deletes challenge with prefixed key', async () => {
      await store.del('user-1');

      expect(redis.del).toHaveBeenCalledWith('webauthn:challenge:user-1');
    });
  });
});
