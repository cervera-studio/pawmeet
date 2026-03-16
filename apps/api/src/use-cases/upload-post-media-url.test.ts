import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost, buildStorageService } from '../test-utils/builders.js';
import { createUploadPostMediaUrl } from './upload-post-media-url.js';

describe('createUploadPostMediaUrl', () => {
  it('returns upload URL for valid request', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      countMediaByPost: vi.fn().mockResolvedValue(2),
    });
    const storage = buildStorageService({
      buildPostMediaKey: vi.fn().mockReturnValue('posts/post-1/photo.jpg'),
      generatePresignedUploadUrl: vi
        .fn()
        .mockResolvedValue('https://cdn.example.com/upload?token=abc'),
    });
    const uploadPostMediaUrl = createUploadPostMediaUrl({ feedRepo, storage });

    const result = await uploadPostMediaUrl('post-1', 'user-1', 'image/jpeg', 1024 * 1024);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.uploadUrl).toBe('https://cdn.example.com/upload?token=abc');
    expect(result.data.key).toBe('posts/post-1/photo.jpg');
    expect(storage.buildPostMediaKey).toHaveBeenCalledWith('post-1', 'image/jpeg');
  });

  it('fails if post not found or not owner', async () => {
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(null),
    });
    const storage = buildStorageService();
    const uploadPostMediaUrl = createUploadPostMediaUrl({ feedRepo, storage });

    const result = await uploadPostMediaUrl('post-1', 'user-1', 'image/jpeg', 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails if post is deleted', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1', isDeleted: true });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
    });
    const storage = buildStorageService();
    const uploadPostMediaUrl = createUploadPostMediaUrl({ feedRepo, storage });

    const result = await uploadPostMediaUrl('post-1', 'user-1', 'image/jpeg', 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_DELETED');
  });

  it('fails if media limit reached (MAX_MEDIA_PER_POST = 10)', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      countMediaByPost: vi.fn().mockResolvedValue(10),
    });
    const storage = buildStorageService();
    const uploadPostMediaUrl = createUploadPostMediaUrl({ feedRepo, storage });

    const result = await uploadPostMediaUrl('post-1', 'user-1', 'image/jpeg', 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MEDIA_LIMIT_REACHED');
  });

  it('fails if file too large', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      countMediaByPost: vi.fn().mockResolvedValue(0),
    });
    const storage = buildStorageService();
    const uploadPostMediaUrl = createUploadPostMediaUrl({ feedRepo, storage });

    // Image max is 5 MB, send 6 MB
    const result = await uploadPostMediaUrl('post-1', 'user-1', 'image/jpeg', 6 * 1024 * 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });
});
