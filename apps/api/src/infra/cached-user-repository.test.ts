import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

import type { Redis } from '@upstash/redis';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { CachedUserRepository } from './cached-user-repository.js';

const fakeRedis = { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel } satisfies Partial<
  Record<string, unknown>
> as unknown as Redis;

describe('CachedUserRepository', () => {
  let inner: ReturnType<typeof buildUserRepo>;
  let cached: CachedUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    inner = buildUserRepo();
    cached = new CachedUserRepository(inner, fakeRedis);
  });

  describe('findById', () => {
    it('returns cached user on cache hit', async () => {
      const user = buildUser();
      mockRedisGet.mockResolvedValue(user);

      const result = await cached.findById('user-1');

      expect(result).toEqual(user);
      expect(inner.findById).not.toHaveBeenCalled();
    });

    it('fetches from inner repo on cache miss and populates cache', async () => {
      const user = buildUser();
      mockRedisGet.mockResolvedValue(null);
      (inner.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      const result = await cached.findById('user-1');

      expect(result).toEqual(user);
      expect(inner.findById).toHaveBeenCalledWith('user-1');
      expect(mockRedisSet).toHaveBeenCalledWith('cache:user:user-1', JSON.stringify(user), {
        ex: 300,
      });
    });

    it('does not cache null result', async () => {
      mockRedisGet.mockResolvedValue(null);
      (inner.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await cached.findById('user-1');

      expect(result).toBeNull();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('invalidates cache after update', async () => {
      const updatedUser = buildUser({ displayName: 'Updated Name' });
      (inner.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

      const result = await cached.update('user-1', { avatarUrl: 'https://example.com/pic.jpg' });

      expect(result).toEqual(updatedUser);
      expect(mockRedisDel).toHaveBeenCalledWith('cache:user:user-1');
    });
  });

  describe('updatePushToken', () => {
    it('invalidates cache after push token update', async () => {
      (inner.updatePushToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await cached.updatePushToken('user-1', 'expo-push-token');

      expect(inner.updatePushToken).toHaveBeenCalledWith('user-1', 'expo-push-token');
      expect(mockRedisDel).toHaveBeenCalledWith('cache:user:user-1');
    });
  });

  describe('pass-through methods (never cached)', () => {
    it('delegates findByEmail to inner repo', async () => {
      const user = buildUser();
      (inner.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      const result = await cached.findByEmail('mario@example.com');

      expect(result).toEqual(user);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('delegates findByIdWithPassword to inner repo (never cached)', async () => {
      const user = buildUser();
      (inner.findByIdWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      const result = await cached.findByIdWithPassword('user-1');

      expect(result).toEqual(user);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('delegates findByIds to inner repo', async () => {
      const users = [buildUser()];
      (inner.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(users);

      const result = await cached.findByIds(['user-1']);

      expect(result).toEqual(users);
    });

    it('delegates findNearby to inner repo', async () => {
      (inner.findNearby as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const query = {
        userId: 'user-1',
        latitude: 41.9,
        longitude: 12.5,
        radiusKm: 10,
        limit: 20,
        offset: 0,
      };
      const result = await cached.findNearby(query);

      expect(result).toEqual([]);
      expect(inner.findNearby).toHaveBeenCalledWith(query);
    });

    it('delegates searchByName to inner repo', async () => {
      (inner.searchByName as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await cached.searchByName('Mario', 'user-2', 10, 0);

      expect(result).toEqual([]);
      expect(inner.searchByName).toHaveBeenCalledWith('Mario', 'user-2', 10, 0);
    });
  });
});
