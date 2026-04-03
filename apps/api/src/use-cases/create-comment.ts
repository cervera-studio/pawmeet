import { MAX_COMMENT_LENGTH } from '@pawmeet/config';
import type { PostComment } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import {
  FALLBACK_DISPLAY_NAME,
  NOTIF_COMMENT_REPLIED,
  NOTIF_POST_COMMENTED,
} from '../constants/notifications.js';
import { sanitizeContent } from '../lib/sanitize.js';
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

async function notifyPostAuthor(
  services: Pick<Deps, 'feedRealtime' | 'notificationService' | 'userRepo'>,
  ctx: {
    postId: string;
    postAuthorId: string;
    userId: string;
    commenterName: string;
    commentId: string;
    preview: string;
  },
): Promise<void> {
  if (ctx.postAuthorId === ctx.userId) return;

  services.feedRealtime.notifyPostCommented(ctx.postAuthorId, ctx.postId, ctx.commenterName);

  const recipient = await services.userRepo.findById(ctx.postAuthorId);
  if (recipient?.notificationPrefs?.feed === false) return;

  services.notificationService
    .send({
      userId: ctx.postAuthorId,
      title: NOTIF_POST_COMMENTED.title(ctx.commenterName),
      body: ctx.preview,
      data: { postId: ctx.postId, commentId: ctx.commentId, type: 'post_comment' },
    })
    .catch((err) => logger.error('createComment', 'Failed to enqueue comment notification', err));
}

async function notifyParentCommentAuthor(
  services: Pick<Deps, 'notificationService' | 'userRepo'>,
  ctx: {
    parentComment: PostComment | null;
    userId: string;
    postAuthorId: string;
    postId: string;
    commenterName: string;
    commentId: string;
    preview: string;
  },
): Promise<void> {
  if (!ctx.parentComment) return;

  const isOwnReply = ctx.parentComment.authorId === ctx.userId;
  const alreadyNotifiedAsPostAuthor = ctx.parentComment.authorId === ctx.postAuthorId;
  if (isOwnReply || alreadyNotifiedAsPostAuthor) return;

  const parentAuthor = await services.userRepo.findById(ctx.parentComment.authorId);
  if (parentAuthor?.notificationPrefs?.feed === false) return;

  services.notificationService
    .send({
      userId: ctx.parentComment.authorId,
      title: NOTIF_COMMENT_REPLIED.title(ctx.commenterName),
      body: ctx.preview,
      data: { postId: ctx.postId, commentId: ctx.commentId, type: 'comment_reply' },
    })
    .catch((err) => logger.error('createComment', 'Failed to enqueue reply notification', err));
}

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
  ): Promise<Result<{ comment: PostComment; postAgeHours: number }>> => {
    if (content.length > MAX_COMMENT_LENGTH) {
      return fail(
        new AppError('COMMENT_TOO_LONG', ERROR_MESSAGES.COMMENT_TOO_LONG(MAX_COMMENT_LENGTH), 400),
      );
    }

    const post = await feedRepo.findPostById(postId);
    if (!post || post.isDeleted) {
      return fail(new AppError('POST_NOT_FOUND', 'Post not found', 404));
    }

    let parentComment: PostComment | null = null;
    if (parentId) {
      parentComment = await feedRepo.findCommentById(parentId);
      if (!parentComment || parentComment.isDeleted || parentComment.postId !== postId) {
        return fail(new AppError('PARENT_COMMENT_NOT_FOUND', 'Parent comment not found', 404));
      }
      // Only allow 1 level of nesting
      if (parentComment.parentId) {
        return fail(new AppError('NESTING_TOO_DEEP', ERROR_MESSAGES.NESTING_TOO_DEEP, 400));
      }
    }

    const sanitizedContent = sanitizeContent(content);

    const comment = await feedRepo.addComment({
      postId,
      authorId: userId,
      content: sanitizedContent,
      parentId: parentId ?? null,
    });

    // Fetch commenter name once for all notifications
    const needsCommenterLookup = post.authorId !== userId || parentComment;
    const commenter = needsCommenterLookup ? await userRepo.findById(userId) : null;
    const commenterName = commenter?.displayName ?? FALLBACK_DISPLAY_NAME;
    const preview =
      sanitizedContent.length > 50 ? `${sanitizedContent.slice(0, 47)}...` : sanitizedContent;

    await notifyPostAuthor(
      { feedRealtime, notificationService, userRepo },
      {
        postId,
        postAuthorId: post.authorId,
        userId,
        commenterName,
        commentId: comment.id,
        preview,
      },
    );

    await notifyParentCommentAuthor(
      { notificationService, userRepo },
      {
        parentComment,
        userId,
        postAuthorId: post.authorId,
        postId,
        commenterName,
        commentId: comment.id,
        preview,
      },
    );

    const postAgeHours = Math.floor(
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    );

    return succeed({ comment, postAgeHours });
  };
}
