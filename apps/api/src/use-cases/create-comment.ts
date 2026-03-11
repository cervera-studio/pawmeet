import { MAX_COMMENT_LENGTH } from '@dogwalk/config';
import type { PostComment } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import type {
  FeedRealtimeService,
  FeedRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
  feedRealtime: FeedRealtimeService;
};

export function createCreateComment({
  feedRepo,
  userRepo,
  notificationService,
  feedRealtime,
}: Deps) {
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

    let parentComment: PostComment | null = null;
    if (parentId) {
      parentComment = await feedRepo.findCommentById(parentId);
      if (!parentComment || parentComment.isDeleted || parentComment.postId !== postId) {
        return fail(new AppError('PARENT_COMMENT_NOT_FOUND', 'Commento genitore non trovato', 404));
      }
      // Only allow 1 level of nesting
      if (parentComment.parentId) {
        return fail(new AppError('NESTING_TOO_DEEP', 'Non puoi rispondere a una risposta', 400));
      }
    }

    const comment = await feedRepo.addComment({
      postId,
      authorId: userId,
      content,
      parentId: parentId ?? null,
    });

    // Fetch commenter name once for all notifications
    const commenter =
      post.authorId !== userId || parentComment ? await userRepo.findById(userId) : null;
    const commenterName = commenter?.displayName ?? 'Qualcuno';

    // Notify the post author (unless they commented on their own post)
    if (post.authorId !== userId) {
      // Real-time WebSocket event
      feedRealtime.notifyPostCommented(post.authorId, postId, commenterName);

      const recipient = await userRepo.findById(post.authorId);
      if (recipient?.notificationPrefs?.feed !== false) {
        const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

        notificationService
          .send({
            userId: post.authorId,
            title: `${commenterName} ha commentato`,
            body: preview,
            data: { postId, commentId: comment.id, type: 'post_comment' },
          })
          .catch((err) =>
            logger.error('createComment', 'Failed to enqueue comment notification', err),
          );
      }
    }

    // If replying, also notify the parent comment author (if different from post author and commenter)
    if (
      parentComment &&
      parentComment.authorId !== userId &&
      parentComment.authorId !== post.authorId
    ) {
      const parentAuthor = await userRepo.findById(parentComment.authorId);
      if (parentAuthor?.notificationPrefs?.feed !== false) {
        const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

        notificationService
          .send({
            userId: parentComment.authorId,
            title: `${commenterName} ha risposto al tuo commento`,
            body: preview,
            data: { postId, commentId: comment.id, type: 'comment_reply' },
          })
          .catch((err) =>
            logger.error('createComment', 'Failed to enqueue reply notification', err),
          );
      }
    }

    return succeed({ comment });
  };
}
