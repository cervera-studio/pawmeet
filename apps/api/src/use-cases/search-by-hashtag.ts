import { FEED_PAGE_SIZE } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { FeedPage, FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createSearchByHashtag({ feedRepo }: Deps) {
  return async (
    hashtag: string,
    cursor: string | null,
    limit: number = FEED_PAGE_SIZE,
  ): Promise<Result<FeedPage>> => {
    const page = await feedRepo.searchPostsByHashtag(hashtag, cursor, limit);
    return succeed(page);
  };
}
