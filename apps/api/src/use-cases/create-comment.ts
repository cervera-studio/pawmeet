import { MAX_COMMENT_LENGTH } from '@dogwalk/config';
import type { PostComment } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createCreateComment({ feedRepo }: Deps) {
  return async (
    postId: string,
    userId: string,
    content: string,
    parentId: string | null,
  ): Promise<Result<{ comment: PostComment }>> => {
    if (content.length > MAX_COMMENT_LENGTH) {
      return fail(
        new AppError(
          'COMMENT_TOO_LONG',
          `Il commento può avere al massimo ${MAX_COMMENT_LENGTH} caratteri`,
          400,
        ),
      );
    }

    const post = await feedRepo.findPostById(postId);
    if (!post || post.isDeleted) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    if (parentId) {
      const parent = await feedRepo.findCommentById(parentId);
      if (!parent || parent.isDeleted || parent.postId !== postId) {
        return fail(new AppError('PARENT_COMMENT_NOT_FOUND', 'Commento genitore non trovato', 404));
      }
      // Only allow 1 level of nesting
      if (parent.parentId) {
        return fail(new AppError('NESTING_TOO_DEEP', 'Non puoi rispondere a una risposta', 400));
      }
    }

    const comment = await feedRepo.addComment({
      postId,
      authorId: userId,
      content,
      parentId: parentId ?? null,
    });

    return succeed({ comment });
  };
}
