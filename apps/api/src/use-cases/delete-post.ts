import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createDeletePost({ feedRepo }: Deps) {
  return async (postId: string, userId: string): Promise<Result<void>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.authorId !== userId) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    if (post.isDeleted) {
      return fail(new AppError('POST_ALREADY_DELETED', 'Il post è già stato eliminato', 400));
    }

    await feedRepo.softDeletePost(postId);
    return succeed(undefined);
  };
}
