import type { Hashtag, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { Redis } from '@upstash/redis';
import { createCache } from '../lib/cache.js';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
  redis: Redis;
};

export function createGetTrendingHashtags({ feedRepo, redis }: Deps) {
  const cache = createCache<Hashtag>(redis, {
    prefix: 'cache:trending',
    ttlSeconds: 1800,
  });

  return async (limit: number): Promise<Result<{ hashtags: Hashtag[] }>> => {
    const hashtags = await cache.getList(`hashtags:${limit}`, () =>
      feedRepo.getTrendingHashtags(limit),
    );
    return succeed({ hashtags });
  };
}
