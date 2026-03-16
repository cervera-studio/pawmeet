import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createGetPostDetail } from './get-post-detail.js';

describe('createGetPostDetail', () => {
  it('returns post detail when found', async () => {
    const feedItem = {
      id: 'post-1',
      authorId: 'user-1',
      caption: 'Una bella giornata al parco',
      walkId: null,
      latitude: null,
      longitude: null,
      likesCount: 5,
      commentsCount: 2,
      moderationStatus: 'approved',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: 'user-1', displayName: 'Mario', avatarUrl: null },
      media: [],
      liked: false,
    };
    const feedRepo = buildFeedRepo({
      findPostWithAuthor: vi.fn().mockResolvedValue(feedItem),
    });
    const getPostDetail = createGetPostDetail({ feedRepo });

    const result = await getPostDetail('post-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.post).toEqual(feedItem);
    expect(feedRepo.findPostWithAuthor).toHaveBeenCalledWith('post-1', 'user-2');
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({
      findPostWithAuthor: vi.fn().mockResolvedValue(null),
    });
    const getPostDetail = createGetPostDetail({ feedRepo });

    const result = await getPostDetail('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });
});
