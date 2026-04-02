import { describe, expect, it, vi } from 'vitest';
import { createCache } from './cache.js';

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockRedis() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, typeof value === 'string' ? JSON.parse(value as string) : value);
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) store.delete(k);
      return keys.length;
    }),
    store,
  };
}

describe('cache', () => {
  describe('createCache', () => {
    describe('get', () => {
      it('returns cached value on cache hit', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        // Pre-populate cache
        redis.store.set('test:1', { id: '1', name: 'Rex' });

        const result = await cache.get('1', async () => ({ id: '1', name: 'Other' }));
        expect(result).toEqual({ id: '1', name: 'Rex' });
      });

      it('calls fetchFn on cache miss and caches the result', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        const fetchFn = vi.fn().mockResolvedValue({ id: '2', name: 'Buddy' });
        const result = await cache.get('2', fetchFn);

        expect(result).toEqual({ id: '2', name: 'Buddy' });
        expect(fetchFn).toHaveBeenCalledOnce();
        expect(redis.set).toHaveBeenCalledWith(
          'test:2',
          JSON.stringify({ id: '2', name: 'Buddy' }),
          { ex: 60 },
        );
      });

      it('returns null when fetchFn returns null and does not cache', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        const result = await cache.get('3', async () => null);
        expect(result).toBeNull();
        expect(redis.set).not.toHaveBeenCalled();
      });
    });

    describe('getList', () => {
      it('returns cached list on cache hit', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'list', ttlSeconds: 120 });

        redis.store.set('list:dogs', [{ id: '1' }, { id: '2' }]);

        const result = await cache.getList('dogs', async () => []);
        expect(result).toEqual([{ id: '1' }, { id: '2' }]);
      });

      it('calls fetchFn on miss and caches non-empty results', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'list', ttlSeconds: 120 });

        const data = [{ id: '1' }];
        const result = await cache.getList('items', async () => data);

        expect(result).toEqual(data);
        expect(redis.set).toHaveBeenCalledOnce();
      });

      it('does not cache empty arrays', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'list', ttlSeconds: 120 });

        const result = await cache.getList('empty', async () => []);
        expect(result).toEqual([]);
        expect(redis.set).not.toHaveBeenCalled();
      });
    });

    describe('invalidate', () => {
      it('deletes a cached key', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        redis.store.set('test:1', { id: '1' });
        await cache.invalidate('1');
        expect(redis.del).toHaveBeenCalledWith('test:1');
      });
    });

    describe('invalidateMany', () => {
      it('deletes multiple cached keys', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        await cache.invalidateMany(['1', '2', '3']);
        expect(redis.del).toHaveBeenCalledWith('test:1', 'test:2', 'test:3');
      });

      it('does nothing for empty array', async () => {
        const redis = createMockRedis();
        const cache = createCache(redis as never, { prefix: 'test', ttlSeconds: 60 });

        await cache.invalidateMany([]);
        expect(redis.del).not.toHaveBeenCalled();
      });
    });
  });
});
