import type { Hashtag, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createGetTrendingHashtags({ feedRepo }: Deps) {
  return async (limit: number): Promise<Result<{ hashtags: Hashtag[] }>> => {
    const hashtags = await feedRepo.getTrendingHashtags(limit);
    return succeed({ hashtags });
  };
}
