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
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { CachedDogRepository } from './cached-dog-repository.js';

const fakeRedis = { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel } satisfies Partial<
  Record<string, unknown>
> as unknown as Redis;

describe('CachedDogRepository', () => {
  let inner: ReturnType<typeof buildDogRepo>;
  let cached: CachedDogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    inner = buildDogRepo();
    cached = new CachedDogRepository(inner, fakeRedis);
  });

  describe('findById', () => {
    it('returns cached dog on cache hit', async () => {
      const dog = buildDog();
      mockRedisGet.mockResolvedValue(dog);

      const result = await cached.findById('dog-1');

      expect(result).toEqual(dog);
      expect(inner.findById).not.toHaveBeenCalled();
    });

    it('fetches from inner repo on cache miss and populates cache', async () => {
      const dog = buildDog();
      mockRedisGet.mockResolvedValue(null);
      (inner.findById as ReturnType<typeof vi.fn>).mockResolvedValue(dog);

      const result = await cached.findById('dog-1');

      expect(result).toEqual(dog);
      expect(inner.findById).toHaveBeenCalledWith('dog-1');
      expect(mockRedisSet).toHaveBeenCalledWith('cache:dog:dog-1', JSON.stringify(dog), {
        ex: 300,
      });
    });

    it('does not cache null result', async () => {
      mockRedisGet.mockResolvedValue(null);
      (inner.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await cached.findById('dog-1');

      expect(result).toBeNull();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('invalidates cache after update', async () => {
      const updatedDog = buildDog({ name: 'Updated Rex' });
      (inner.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDog);

      const result = await cached.update('dog-1', { name: 'Updated Rex' });

      expect(result).toEqual(updatedDog);
      expect(inner.update).toHaveBeenCalledWith('dog-1', { name: 'Updated Rex' });
      expect(mockRedisDel).toHaveBeenCalledWith('cache:dog:dog-1');
    });
  });

  describe('softDelete', () => {
    it('invalidates cache after soft delete', async () => {
      (inner.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await cached.softDelete('dog-1');

      expect(inner.softDelete).toHaveBeenCalledWith('dog-1');
      expect(mockRedisDel).toHaveBeenCalledWith('cache:dog:dog-1');
    });
  });

  describe('pass-through methods', () => {
    it('delegates findByOwner to inner repo', async () => {
      const dogs = [buildDog()];
      (inner.findByOwner as ReturnType<typeof vi.fn>).mockResolvedValue(dogs);

      const result = await cached.findByOwner('user-1', true);

      expect(result).toEqual(dogs);
      expect(inner.findByOwner).toHaveBeenCalledWith('user-1', true);
    });

    it('delegates findByIds to inner repo', async () => {
      const dogs = [buildDog()];
      (inner.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(dogs);

      const result = await cached.findByIds(['dog-1']);

      expect(result).toEqual(dogs);
      expect(inner.findByIds).toHaveBeenCalledWith(['dog-1']);
    });

    it('delegates countByOwner to inner repo', async () => {
      (inner.countByOwner as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const result = await cached.countByOwner('user-1');

      expect(result).toBe(3);
    });
  });
});
