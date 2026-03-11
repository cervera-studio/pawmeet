import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createGetPostComments } from './get-post-comments.js';

describe('createGetPostComments', () => {
  it('returns comments for a post', async () => {
    const commentsPage = {
      comments: [
        {
          id: 'comment-1',
          postId: 'post-1',
          authorId: 'user-1',
          parentId: null,
          content: 'Che bello!',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: 'user-1', displayName: 'Mario Rossi', avatarUrl: null },
        },
      ],
      nextCursor: null,
    };
    const feedRepo = buildFeedRepo({
      getComments: vi.fn().mockResolvedValue(commentsPage),
    });
    const getPostComments = createGetPostComments({ feedRepo });

    const result = await getPostComments('post-1', null);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.comments).toHaveLength(1);
    expect(result.data.nextCursor).toBeNull();
    expect(feedRepo.getComments).toHaveBeenCalledWith('post-1', null, expect.any(Number));
  });

  it('passes cursor and limit to repository', async () => {
    const feedRepo = buildFeedRepo({
      getComments: vi.fn().mockResolvedValue({ comments: [], nextCursor: null }),
    });
    const getPostComments = createGetPostComments({ feedRepo });

    await getPostComments('post-1', 'cursor-abc', 5);

    expect(feedRepo.getComments).toHaveBeenCalledWith('post-1', 'cursor-abc', 5);
  });
});
