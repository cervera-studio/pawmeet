import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createGetUserPosts } from './get-user-posts.js';

describe('createGetUserPosts', () => {
  it('returns posts for a target user', async () => {
    const feedPage = {
      items: [
        {
          id: 'post-1',
          authorId: 'user-2',
          caption: 'Una passeggiata',
          walkId: null,
          latitude: null,
          longitude: null,
          likesCount: 5,
          commentsCount: 2,
          moderationStatus: 'approved',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: 'user-2', displayName: 'Luigi', avatarUrl: null },
          media: [],
          liked: false,
        },
      ],
      nextCursor: null,
    };
    const feedRepo = buildFeedRepo({
      getUserPosts: vi.fn().mockResolvedValue(feedPage),
    });
    const getUserPosts = createGetUserPosts({ feedRepo });

    const result = await getUserPosts('user-2', 'user-1', null);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.items).toHaveLength(1);
    expect(result.data.nextCursor).toBeNull();
    expect(feedRepo.getUserPosts).toHaveBeenCalledWith(
      'user-2',
      'user-1',
      null,
      expect.any(Number),
    );
  });

  it('passes cursor and limit to repository', async () => {
    const feedRepo = buildFeedRepo({
      getUserPosts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    });
    const getUserPosts = createGetUserPosts({ feedRepo });

    await getUserPosts('user-2', 'user-1', 'cursor-abc', 5);

    expect(feedRepo.getUserPosts).toHaveBeenCalledWith('user-2', 'user-1', 'cursor-abc', 5);
  });
});
