import type { RecommendationCacheRepository } from '../ports/recommendation-cache-repository.js';

export function createRedisRecommendationCacheRepository(): RecommendationCacheRepository {
  return {
    async getTopRecommendations(userId: string, limit: number): Promise<string[]> {
      const { redis } = await import('../lib/redis.js');
      const recsKey = `ml:recs:${userId}`;
      return redis.zrange<string[]>(recsKey, 0, limit - 1, { rev: true });
    },
  };
}
