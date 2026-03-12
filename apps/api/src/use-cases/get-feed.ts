import { FEED_PAGE_SIZE } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { FeedPage, FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createGetFeed({ feedRepo }: Deps) {
  return async (
    userId: string,
    cursor: string | null,
    limit: number = FEED_PAGE_SIZE,
  ): Promise<Result<FeedPage>> => {
    const feed = await feedRepo.getFeedForUser(userId, cursor, limit);
    return succeed(feed);
  };
}
