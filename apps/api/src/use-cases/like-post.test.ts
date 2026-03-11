import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createLikePost } from './like-post.js';

describe('createLikePost', () => {
  it('likes a post that has not been liked yet', async () => {
    const post = buildPost();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      hasLiked: vi.fn().mockResolvedValue(false),
      addLike: vi.fn().mockResolvedValue({
        id: 'like-1',
        postId: 'post-1',
        userId: 'user-1',
        createdAt: new Date(),
      }),
    });
    const likePost = createLikePost({ feedRepo });

    const result = await likePost('post-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.liked).toBe(true);
    expect(feedRepo.addLike).toHaveBeenCalledWith('post-1', 'user-1');
  });

  it('unlikes a post that has been liked', async () => {
    const post = buildPost();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      hasLiked: vi.fn().mockResolvedValue(true),
      removeLike: vi.fn().mockResolvedValue(undefined),
    });
    const likePost = createLikePost({ feedRepo });

    const result = await likePost('post-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.liked).toBe(false);
    expect(feedRepo.removeLike).toHaveBeenCalledWith('post-1', 'user-1');
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(null) });
    const likePost = createLikePost({ feedRepo });

    const result = await likePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when post is deleted', async () => {
    const post = buildPost({ isDeleted: true });
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(post) });
    const likePost = createLikePost({ feedRepo });

    const result = await likePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });
});
