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
import type { Breed, BreedRepository } from '../ports/breed-repository.js';
import { CachedBreedRepository } from './cached-breed-repository.js';

function buildBreed(overrides: Partial<Breed> = {}): Breed {
  return {
    id: 'breed-1',
    code: 'labrador',
    group: 'sporting',
    sizeCategory: 'large',
    avgWeightKg: 30,
    energy: 4,
    playfulness: 5,
    trainability: 5,
    barking: 3,
    goodWithOtherDogs: 4,
    goodWithChildren: 5,
    goodWithStrangers: 4,
    protectiveness: 2,
    shedding: 4,
    grooming: 2,
    ...overrides,
  };
}

function buildInnerRepo(overrides: Partial<BreedRepository> = {}): BreedRepository {
  return {
    search: vi.fn<BreedRepository['search']>().mockResolvedValue([]),
    ...overrides,
  };
}

const fakeRedis = { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel } satisfies Partial<
  Record<string, unknown>
> as unknown as Redis;

describe('CachedBreedRepository', () => {
  let inner: BreedRepository;
  let cached: CachedBreedRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    inner = buildInnerRepo();
    cached = new CachedBreedRepository(inner, fakeRedis);
  });

  describe('search without query (full list)', () => {
    it('returns cached list on cache hit', async () => {
      const breeds = [buildBreed(), buildBreed({ id: 'breed-2', code: 'poodle' })];
      mockRedisGet.mockResolvedValue(breeds);

      const result = await cached.search();

      expect(result).toEqual(breeds);
      expect(inner.search).not.toHaveBeenCalled();
    });

    it('fetches from inner repo on cache miss and populates cache', async () => {
      const breeds = [buildBreed()];
      mockRedisGet.mockResolvedValue(null);
      (inner.search as ReturnType<typeof vi.fn>).mockResolvedValue(breeds);

      const result = await cached.search();

      expect(result).toEqual(breeds);
      expect(inner.search).toHaveBeenCalledWith();
      expect(mockRedisSet).toHaveBeenCalledWith('cache:breed:all', JSON.stringify(breeds), {
        ex: 3600,
      });
    });

    it('does not cache empty breed list', async () => {
      mockRedisGet.mockResolvedValue(null);
      (inner.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await cached.search();

      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('search with query (filtered)', () => {
    it('bypasses cache and delegates to inner repo', async () => {
      const breeds = [buildBreed({ code: 'labrador' })];
      (inner.search as ReturnType<typeof vi.fn>).mockResolvedValue(breeds);

      const result = await cached.search('labrador');

      expect(result).toEqual(breeds);
      expect(inner.search).toHaveBeenCalledWith('labrador');
      expect(mockRedisGet).not.toHaveBeenCalled();
    });
  });
});
