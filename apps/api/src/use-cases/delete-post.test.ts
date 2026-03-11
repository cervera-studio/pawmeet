import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createDeletePost } from './delete-post.js';

describe('createDeletePost', () => {
  it('soft-deletes a post owned by the user', async () => {
    const post = buildPost({ authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      softDeletePost: vi.fn().mockResolvedValue(undefined),
    });
    const deletePost = createDeletePost({ feedRepo });

    const result = await deletePost('post-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(feedRepo.softDeletePost).toHaveBeenCalledWith('post-1');
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(null) });
    const deletePost = createDeletePost({ feedRepo });

    const result = await deletePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when user does not own the post', async () => {
    const post = buildPost({ authorId: 'other-user' });
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(post) });
    const deletePost = createDeletePost({ feedRepo });

    const result = await deletePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when post is already deleted', async () => {
    const post = buildPost({ authorId: 'user-1', isDeleted: true });
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(post) });
    const deletePost = createDeletePost({ feedRepo });

    const result = await deletePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_ALREADY_DELETED');
  });
});
