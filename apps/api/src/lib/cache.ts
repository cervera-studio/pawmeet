import { logger } from '@pawmeet/utils';
import type { Redis } from '@upstash/redis';

interface CacheOptions {
  /** Redis key prefix, e.g. "cache:user" */
  prefix: string;
  /** TTL in seconds */
  ttlSeconds: number;
}

/**
 * Cache-aside helper using Upstash Redis REST.
 * - get: check cache → miss → fetch from DB → populate cache
 * - invalidate: delete key on mutation
 */
export function createCache<T>(redis: Redis, options: CacheOptions) {
  const { prefix, ttlSeconds } = options;

  function key(id: string): string {
    return `${prefix}:${id}`;
  }

  return {
    async get(id: string, fetchFn: () => Promise<T | null>): Promise<T | null> {
      try {
        const cached = await redis.get<T>(key(id));
        if (cached !== null && cached !== undefined) return cached;
      } catch (err) {
        logger.warn('cache', `Redis GET failed for ${key(id)}: ${err}`);
      }

      const data = await fetchFn();

      if (data !== null) {
        try {
          await redis.set(key(id), JSON.stringify(data), { ex: ttlSeconds });
        } catch (err) {
          logger.warn('cache', `Redis SET failed for ${key(id)}: ${err}`);
        }
      }

      return data;
    },

    async getList(id: string, fetchFn: () => Promise<T[]>): Promise<T[]> {
      try {
        const cached = await redis.get<T[]>(key(id));
        if (cached !== null && cached !== undefined) return cached;
      } catch (err) {
        logger.warn('cache', `Redis GET failed for ${key(id)}: ${err}`);
      }

      const data = await fetchFn();

      if (data.length > 0) {
        try {
          await redis.set(key(id), JSON.stringify(data), { ex: ttlSeconds });
        } catch (err) {
          logger.warn('cache', `Redis SET failed for ${key(id)}: ${err}`);
        }
      }

      return data;
    },

    async invalidate(id: string): Promise<void> {
      try {
        await redis.del(key(id));
      } catch (err) {
        logger.warn('cache', `Redis DEL failed for ${key(id)}: ${err}`);
      }
    },

    async invalidateMany(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      try {
        await redis.del(...ids.map(key));
      } catch (err) {
        logger.warn('cache', `Redis DEL failed for ${prefix}: ${err}`);
      }
    },
  };
}
