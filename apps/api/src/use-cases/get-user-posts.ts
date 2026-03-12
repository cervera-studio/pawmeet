import { FEED_PAGE_SIZE } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { FeedPage, FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createGetUserPosts({ feedRepo }: Deps) {
  return async (
    targetUserId: string,
    currentUserId: string,
    cursor: string | null,
    limit: number = FEED_PAGE_SIZE,
  ): Promise<Result<FeedPage>> => {
    const feed = await feedRepo.getUserPosts(targetUserId, currentUserId, cursor, limit);
    return succeed(feed);
  };
}
