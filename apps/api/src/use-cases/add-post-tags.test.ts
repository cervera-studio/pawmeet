import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createAddPostTags } from './add-post-tags.js';

describe('createAddPostTags', () => {
  it('successfully adds tags to own post', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const createdTags = [
      {
        id: 'tag-1',
        postId: 'post-1',
        taggedUserId: 'user-2',
        taggedDogId: null,
        createdAt: new Date(),
      },
    ];
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      getConnectedUserIds: vi.fn().mockResolvedValue(['user-2', 'user-3']),
      addTags: vi.fn().mockResolvedValue(createdTags),
    });
    const addPostTags = createAddPostTags({ feedRepo });

    const result = await addPostTags('post-1', 'user-1', [{ taggedUserId: 'user-2' }]);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.tags).toEqual(createdTags);
    expect(feedRepo.addTags).toHaveBeenCalledWith('post-1', [{ taggedUserId: 'user-2' }]);
  });

  it('fails if post not found', async () => {
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(null),
    });
    const addPostTags = createAddPostTags({ feedRepo });

    const result = await addPostTags('post-1', 'user-1', [{ taggedUserId: 'user-2' }]);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails if not the author', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'other-user' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
    });
    const addPostTags = createAddPostTags({ feedRepo });

    const result = await addPostTags('post-1', 'user-1', [{ taggedUserId: 'user-2' }]);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FORBIDDEN');
  });

  it('fails if tag has no target (no userId nor dogId)', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
    });
    const addPostTags = createAddPostTags({ feedRepo });

    const result = await addPostTags('post-1', 'user-1', [
      { taggedUserId: null, taggedDogId: null },
    ]);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_TAGS');
  });

  it('fails if tagged user is not connected', async () => {
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue(post),
      getConnectedUserIds: vi.fn().mockResolvedValue(['user-3']),
    });
    const addPostTags = createAddPostTags({ feedRepo });

    const result = await addPostTags('post-1', 'user-1', [{ taggedUserId: 'user-2' }]);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TAG_NOT_CONNECTED');
  });
});
