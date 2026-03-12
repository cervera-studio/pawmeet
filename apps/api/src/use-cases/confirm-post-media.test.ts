import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildFeedRepo,
  buildPost,
  buildPostMedia,
  buildStorageService,
} from '../test-utils/builders.js';
import { createConfirmPostMedia } from './confirm-post-media.js';

describe('createConfirmPostMedia', () => {
  it('confirms media for an owned post', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const media = buildPostMedia();
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      addMedia: vi.fn().mockResolvedValue(media),
    });
    const storage = buildStorageService({
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/posts/post-1/photo.jpg'),
    });
    const confirmPostMedia = createConfirmPostMedia({ feedRepo, storage });

    const result = await confirmPostMedia('post-1', 'user-1', 'posts/post-1/photo.jpg', 'photo', 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.media).toEqual(media);
    expect(feedRepo.addMedia).toHaveBeenCalledWith({
      postId: 'post-1',
      url: 'https://cdn.example.com/posts/post-1/photo.jpg',
      mediaType: 'photo',
      thumbnailUrl: null,
      position: 0,
    });
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(null) });
    const storage = buildStorageService();
    const confirmPostMedia = createConfirmPostMedia({ feedRepo, storage });

    const result = await confirmPostMedia('post-1', 'user-1', 'posts/post-1/photo.jpg', 'photo', 0);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when key does not match post id', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(post) });
    const storage = buildStorageService();
    const confirmPostMedia = createConfirmPostMedia({ feedRepo, storage });

    const result = await confirmPostMedia(
      'post-1',
      'user-1',
      'posts/post-999/photo.jpg',
      'photo',
      0,
    );

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_MEDIA_KEY');
  });
});
