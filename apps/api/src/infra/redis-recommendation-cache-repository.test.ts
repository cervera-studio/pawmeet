import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockZrange = vi.fn();

vi.mock('../lib/redis.js', () => ({
  redis: {
    zrange: (...args: unknown[]) => mockZrange(...args),
  },
}));

import { createRedisRecommendationCacheRepository } from './redis-recommendation-cache-repository.js';

describe('RedisRecommendationCacheRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns top recommendations from Redis sorted set', async () => {
    mockZrange.mockResolvedValue(['dog-1', 'dog-2', 'dog-3']);

    const repo = createRedisRecommendationCacheRepository();
    const result = await repo.getTopRecommendations('user-1', 3);

    expect(result).toEqual(['dog-1', 'dog-2', 'dog-3']);
    expect(mockZrange).toHaveBeenCalledWith('ml:recs:user-1', 0, 2, { rev: true });
  });

  it('returns empty array when no recommendations exist', async () => {
    mockZrange.mockResolvedValue([]);

    const repo = createRedisRecommendationCacheRepository();
    const result = await repo.getTopRecommendations('user-1', 5);

    expect(result).toEqual([]);
  });

  it('builds the correct Redis key from userId', async () => {
    mockZrange.mockResolvedValue([]);

    const repo = createRedisRecommendationCacheRepository();
    await repo.getTopRecommendations('user-42', 10);

    expect(mockZrange).toHaveBeenCalledWith('ml:recs:user-42', 0, 9, { rev: true });
  });

  it('passes limit - 1 as the stop index', async () => {
    mockZrange.mockResolvedValue(['dog-1']);

    const repo = createRedisRecommendationCacheRepository();
    await repo.getTopRecommendations('user-1', 1);

    expect(mockZrange).toHaveBeenCalledWith('ml:recs:user-1', 0, 0, { rev: true });
  });
});
