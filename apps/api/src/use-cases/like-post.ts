import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createLikePost({ feedRepo }: Deps) {
  return async (postId: string, userId: string): Promise<Result<{ liked: boolean }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.isDeleted) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    const alreadyLiked = await feedRepo.hasLiked(postId, userId);

    if (alreadyLiked) {
      await feedRepo.removeLike(postId, userId);
      return succeed({ liked: false });
    }

    await feedRepo.addLike(postId, userId);
    return succeed({ liked: true });
  };
}
