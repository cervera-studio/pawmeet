import { FEED_PAGE_SIZE } from '@dogwalk/config';
import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
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
