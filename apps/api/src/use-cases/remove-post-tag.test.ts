import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildPost } from '../test-utils/builders.js';
import { createRemovePostTag } from './remove-post-tag.js';

describe('createRemovePostTag', () => {
  it('author can remove a tag', async () => {
    const tag = { postId: 'post-1', taggedUserId: 'user-2' };
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findTagById: vi.fn().mockResolvedValue(tag),
      findPostById: vi.fn().mockResolvedValue(post),
      removeTags: vi.fn().mockResolvedValue(undefined),
    });
    const removePostTag = createRemovePostTag({ feedRepo });

    const result = await removePostTag('tag-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.removed).toBe(true);
    expect(feedRepo.removeTags).toHaveBeenCalledWith(['tag-1']);
  });

  it('tagged user can remove their own tag', async () => {
    const tag = { postId: 'post-1', taggedUserId: 'user-2' };
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findTagById: vi.fn().mockResolvedValue(tag),
      findPostById: vi.fn().mockResolvedValue(post),
      removeTags: vi.fn().mockResolvedValue(undefined),
    });
    const removePostTag = createRemovePostTag({ feedRepo });

    const result = await removePostTag('tag-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.removed).toBe(true);
    expect(feedRepo.removeTags).toHaveBeenCalledWith(['tag-1']);
  });

  it('fails if tag not found', async () => {
    const feedRepo = buildFeedRepo({
      findTagById: vi.fn().mockResolvedValue(null),
    });
    const removePostTag = createRemovePostTag({ feedRepo });

    const result = await removePostTag('tag-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TAG_NOT_FOUND');
  });

  it('fails if not author nor tagged user', async () => {
    const tag = { postId: 'post-1', taggedUserId: 'user-2' };
    const post = buildPost({ id: 'post-1', authorId: 'user-1' });
    const feedRepo = buildFeedRepo({
      findTagById: vi.fn().mockResolvedValue(tag),
      findPostById: vi.fn().mockResolvedValue(post),
    });
    const removePostTag = createRemovePostTag({ feedRepo });

    const result = await removePostTag('tag-1', 'user-3');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FORBIDDEN');
  });
});
