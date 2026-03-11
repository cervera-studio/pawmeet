import type { FeedItem } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
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
