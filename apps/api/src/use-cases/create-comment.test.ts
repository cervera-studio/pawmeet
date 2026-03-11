import { MAX_COMMENT_LENGTH } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildComment, buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createCreateComment } from './create-comment.js';

describe('createCreateComment', () => {
  it('creates a top-level comment', async () => {
    const post = buildPost();
    const comment = buildComment();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      addComment: vi.fn().mockResolvedValue(comment),
    });
    const createComment = createCreateComment({ feedRepo });

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
    const createComment = createCreateComment({ feedRepo });

    const result = await createComment('post-1', 'user-1', 'Grazie!', 'comment-parent');

    expect(isSuccess(result)).toBe(true);
  });

  it('fails when comment is too long', async () => {
    const feedRepo = buildFeedRepo();
    const createComment = createCreateComment({ feedRepo });

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
    const createComment = createCreateComment({ feedRepo });

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
    const createComment = createCreateComment({ feedRepo });

    const result = await createComment('post-1', 'user-1', 'Reply to reply', 'comment-nested');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NESTING_TOO_DEEP');
  });
});
