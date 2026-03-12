import { FEED_PAGE_SIZE } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { CommentsPage, FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createGetPostComments({ feedRepo }: Deps) {
  return async (
    postId: string,
    cursor: string | null,
    limit: number = FEED_PAGE_SIZE,
  ): Promise<Result<CommentsPage>> => {
    const comments = await feedRepo.getComments(postId, cursor, limit);
    return succeed(comments);
  };
}
