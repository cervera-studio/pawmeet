import type { FeedItem } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createGetPostDetail({ feedRepo }: Deps) {
  return async (postId: string, userId: string): Promise<Result<{ post: FeedItem }>> => {
    const post = await feedRepo.findPostWithAuthor(postId, userId);
    if (!post) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }
    return succeed({ post });
  };
}
