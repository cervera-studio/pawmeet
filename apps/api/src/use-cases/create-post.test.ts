import { MAX_POST_CAPTION } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createCreatePost } from './create-post.js';

describe('createCreatePost', () => {
  it('creates a post successfully', async () => {
    const post = buildPost();
    const feedRepo = buildFeedRepo({ createPost: vi.fn().mockResolvedValue(post) });
    const createPost = createCreatePost({ feedRepo });

    const result = await createPost('user-1', {
      caption: 'Una bella passeggiata',
      latitude: 41.9028,
      longitude: 12.4964,
      walkId: null,
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.post).toEqual(post);
    expect(feedRepo.createPost).toHaveBeenCalledWith({
      authorId: 'user-1',
      caption: 'Una bella passeggiata',
      latitude: 41.9028,
      longitude: 12.4964,
      walkId: null,
    });
  });

  it('creates a post with null caption', async () => {
    const post = buildPost({ caption: null });
    const feedRepo = buildFeedRepo({ createPost: vi.fn().mockResolvedValue(post) });
    const createPost = createCreatePost({ feedRepo });

    const result = await createPost('user-1', {
      caption: null,
      latitude: null,
      longitude: null,
      walkId: null,
    });

    expect(isSuccess(result)).toBe(true);
  });

  it('fails when caption is too long', async () => {
    const feedRepo = buildFeedRepo();
    const createPost = createCreatePost({ feedRepo });
    const longCaption = 'a'.repeat(MAX_POST_CAPTION + 1);

    const result = await createPost('user-1', {
      caption: longCaption,
      latitude: null,
      longitude: null,
      walkId: null,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CAPTION_TOO_LONG');
  });
});
