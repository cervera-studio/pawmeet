import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createDeletePost({ feedRepo }: Deps) {
  return async (
    postId: string,
    userId: string,
  ): Promise<Result<{ postAgeHours: number; mediaCount: number }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.authorId !== userId) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    if (post.isDeleted) {
      return fail(new AppError('POST_ALREADY_DELETED', 'Il post è già stato eliminato', 400));
    }

    const postAgeHours = Math.floor(
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const mediaCount = await feedRepo.countMediaByPost(postId);

    await feedRepo.softDeletePost(postId);
    return succeed({ postAgeHours, mediaCount });
  };
}
