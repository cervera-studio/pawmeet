import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildComment, buildFeedRepo } from '../test-utils/builders.js';
import { createDeleteComment } from './delete-comment.js';

describe('createDeleteComment', () => {
  it('deletes a comment owned by the user', async () => {
    const comment = buildComment({ id: 'comment-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findCommentById: vi.fn().mockResolvedValue(comment),
      softDeleteComment: vi.fn().mockResolvedValue(undefined),
    });
    const deleteComment = createDeleteComment({ feedRepo });

    const result = await deleteComment('comment-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(feedRepo.softDeleteComment).toHaveBeenCalledWith('comment-1');
  });

  it('fails when comment not found', async () => {
    const feedRepo = buildFeedRepo({
      findCommentById: vi.fn().mockResolvedValue(null),
    });
    const deleteComment = createDeleteComment({ feedRepo });

    const result = await deleteComment('comment-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('COMMENT_NOT_FOUND');
  });

  it('fails when user is not the author', async () => {
    const comment = buildComment({ id: 'comment-1', authorId: 'user-2' });
    const feedRepo = buildFeedRepo({
      findCommentById: vi.fn().mockResolvedValue(comment),
    });
    const deleteComment = createDeleteComment({ feedRepo });

    const result = await deleteComment('comment-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('COMMENT_NOT_FOUND');
  });

  it('fails when comment is already deleted', async () => {
    const comment = buildComment({ id: 'comment-1', authorId: 'user-1', isDeleted: true });
    const feedRepo = buildFeedRepo({
      findCommentById: vi.fn().mockResolvedValue(comment),
    });
    const deleteComment = createDeleteComment({ feedRepo });

    const result = await deleteComment('comment-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('COMMENT_ALREADY_DELETED');
  });
});
