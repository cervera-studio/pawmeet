import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createDeleteComment({ feedRepo }: Deps) {
  return async (commentId: string, userId: string): Promise<Result<void>> => {
    const comment = await feedRepo.findCommentById(commentId);
    if (!comment || comment.authorId !== userId) {
      return fail(new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404));
    }

    if (comment.isDeleted) {
      return fail(
        new AppError('COMMENT_ALREADY_DELETED', ERROR_MESSAGES.COMMENT_ALREADY_DELETED, 400),
      );
    }

    await feedRepo.softDeleteComment(commentId);
    return succeed(undefined);
  };
}
