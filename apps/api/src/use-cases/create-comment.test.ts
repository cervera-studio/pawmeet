import { MAX_COMMENT_LENGTH } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildComment,
  buildFeedRealtimeService,
  buildFeedRepo,
  buildNotificationService,
  buildPost,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createCreateComment } from './create-comment.js';

function buildDeps(overrides?: {
  feedRepo?: ReturnType<typeof buildFeedRepo>;
  userRepo?: ReturnType<typeof buildUserRepo>;
  notificationService?: ReturnType<typeof buildNotificationService>;
  feedRealtime?: ReturnType<typeof buildFeedRealtimeService>;
}) {
  return {
    feedRepo: overrides?.feedRepo ?? buildFeedRepo(),
    userRepo: overrides?.userRepo ?? buildUserRepo(),
    notificationService: overrides?.notificationService ?? buildNotificationService(),
    feedRealtime: overrides?.feedRealtime ?? buildFeedRealtimeService(),
  };
}

describe('createCreateComment', () => {
  it('creates a top-level comment', async () => {
    const post = buildPost();
    const comment = buildComment();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      addComment: vi.fn().mockResolvedValue(comment),
    });
    const createComment = createCreateComment(buildDeps({ feedRepo }));

    const result = await createComment('post-1', 'user-1', 'Che bello!', null);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.comment).toEqual(comment);
  });

  it('creates a reply to an existing comment', async () => {
    const post = buildPost();
    const parentComment = buildComment({ id: 'comment-parent', postId: 'post-1', parentId: null });
    const reply = buildComment({ id: 'comment-reply', parentId: 'comment-parent' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      findCommentById: vi.fn().mockResolvedValue(parentComment),
      addComment: vi.fn().mockResolvedValue(reply),
    });
    const createComment = createCreateComment(buildDeps({ feedRepo }));

    const result = await createComment('post-1', 'user-1', 'Grazie!', 'comment-parent');

    expect(isSuccess(result)).toBe(true);
  });

  it('fails when comment is too long', async () => {
    const createComment = createCreateComment(buildDeps());

    const result = await createComment(
      'post-1',
      'user-1',
      'a'.repeat(MAX_COMMENT_LENGTH + 1),
      null,
    );

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('COMMENT_TOO_LONG');
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(null) });
    const createComment = createCreateComment(buildDeps({ feedRepo }));

    const result = await createComment('post-1', 'user-1', 'Ciao', null);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when nesting too deep (reply to a reply)', async () => {
    const post = buildPost();
    const nestedParent = buildComment({ id: 'comment-nested', parentId: 'comment-parent' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      findCommentById: vi.fn().mockResolvedValue(nestedParent),
    });
    const createComment = createCreateComment(buildDeps({ feedRepo }));

    const result = await createComment('post-1', 'user-1', 'Reply to reply', 'comment-nested');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NESTING_TOO_DEEP');
  });

  it('sends notification to post author on comment', async () => {
    const post = buildPost({ authorId: 'author-1' });
    const comment = buildComment({ id: 'new-comment' });
    const author = buildUser({
      id: 'author-1',
      notificationPrefs: { matches: true, messages: true, reminders: true, feed: true },
    });
    const commenter = buildUser({ id: 'user-1', displayName: 'Luigi' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      addComment: vi.fn().mockResolvedValue(comment),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'author-1') return Promise.resolve(author);
        if (id === 'user-1') return Promise.resolve(commenter);
        return Promise.resolve(null);
      }),
    });
    const notificationService = buildNotificationService();
    const createComment = createCreateComment(
      buildDeps({ feedRepo, userRepo, notificationService }),
    );

    await createComment('post-1', 'user-1', 'Bel post!', null);

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'author-1',
        data: expect.objectContaining({ type: 'post_comment' }),
      }),
    );
  });

  it('does not notify when user comments on their own post', async () => {
    const post = buildPost({ authorId: 'user-1' });
    const comment = buildComment();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      addComment: vi.fn().mockResolvedValue(comment),
    });
    const notificationService = buildNotificationService();
    const createComment = createCreateComment(buildDeps({ feedRepo, notificationService }));

    await createComment('post-1', 'user-1', 'My own comment', null);

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('notifies parent comment author on reply', async () => {
    const post = buildPost({ authorId: 'author-1' });
    const parentComment = buildComment({
      id: 'parent-1',
      authorId: 'commenter-1',
      postId: 'post-1',
      parentId: null,
    });
    const reply = buildComment({ id: 'reply-1', parentId: 'parent-1' });
    const postAuthor = buildUser({
      id: 'author-1',
      notificationPrefs: { matches: true, messages: true, reminders: true, feed: true },
    });
    const parentAuthor = buildUser({
      id: 'commenter-1',
      displayName: 'Anna',
      notificationPrefs: { matches: true, messages: true, reminders: true, feed: true },
    });
    const replier = buildUser({ id: 'user-1', displayName: 'Marco' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      findCommentById: vi.fn().mockResolvedValue(parentComment),
      addComment: vi.fn().mockResolvedValue(reply),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'author-1') return Promise.resolve(postAuthor);
        if (id === 'commenter-1') return Promise.resolve(parentAuthor);
        if (id === 'user-1') return Promise.resolve(replier);
        return Promise.resolve(null);
      }),
    });
    const notificationService = buildNotificationService();
    const createComment = createCreateComment(
      buildDeps({ feedRepo, userRepo, notificationService }),
    );

    await createComment('post-1', 'user-1', 'Risposta!', 'parent-1');

    // Should notify both post author and parent comment author
    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'author-1',
        data: expect.objectContaining({ type: 'post_comment' }),
      }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'commenter-1',
        data: expect.objectContaining({ type: 'comment_reply' }),
      }),
    );
  });
});
