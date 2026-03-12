import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildFeedRealtimeService,
  buildFeedRepo,
  buildNotificationService,
  buildPost,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createLikePost } from './like-post.js';

function buildDeps(overrides?: {
  feedRepo?: ReturnType<typeof buildFeedRepo>;
  userRepo?: ReturnType<typeof buildUserRepo>;
  notificationService?: ReturnType<typeof buildNotificationService>;
  feedRealtime?: ReturnType<typeof buildFeedRealtimeService>;
}) {
  return {
    feedRepo: overrides?.feedRepo ?? buildFeedRepo(),
    userRepo: overrides?.userRepo ?? buildUserRepo(),
    notificationService: overrides?.notificationService ?? buildNotificationService(),
    feedRealtime: overrides?.feedRealtime ?? buildFeedRealtimeService(),
  };
}

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
    const likePost = createLikePost(buildDeps({ feedRepo }));

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
    const likePost = createLikePost(buildDeps({ feedRepo }));

    const result = await likePost('post-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.liked).toBe(false);
    expect(feedRepo.removeLike).toHaveBeenCalledWith('post-1', 'user-1');
  });

  it('fails when post not found', async () => {
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(null) });
    const likePost = createLikePost(buildDeps({ feedRepo }));

    const result = await likePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('fails when post is deleted', async () => {
    const post = buildPost({ isDeleted: true });
    const feedRepo = buildFeedRepo({ findPostById: vi.fn().mockResolvedValue(post) });
    const likePost = createLikePost(buildDeps({ feedRepo }));

    const result = await likePost('post-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('POST_NOT_FOUND');
  });

  it('sends notification to post author on like', async () => {
    const post = buildPost({ authorId: 'author-1' });
    const author = buildUser({
      id: 'author-1',
      notificationPrefs: { matches: true, messages: true, reminders: true, feed: true },
    });
    const liker = buildUser({ id: 'user-1', displayName: 'Mario' });
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
    const userRepo = buildUserRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'author-1') return Promise.resolve(author);
        if (id === 'user-1') return Promise.resolve(liker);
        return Promise.resolve(null);
      }),
    });
    const notificationService = buildNotificationService();
    const likePost = createLikePost(buildDeps({ feedRepo, userRepo, notificationService }));

    await likePost('post-1', 'user-1');

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'author-1',
        data: expect.objectContaining({ type: 'post_like' }),
      }),
    );
  });

  it('does not notify when user likes their own post', async () => {
    const post = buildPost({ authorId: 'user-1' });
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
    const notificationService = buildNotificationService();
    const likePost = createLikePost(buildDeps({ feedRepo, notificationService }));

    await likePost('post-1', 'user-1');

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('does not notify when author has feed notifications disabled', async () => {
    const post = buildPost({ authorId: 'author-1' });
    const author = buildUser({
      id: 'author-1',
      notificationPrefs: { matches: true, messages: true, reminders: true, feed: false },
    });
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
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(author) });
    const notificationService = buildNotificationService();
    const likePost = createLikePost(buildDeps({ feedRepo, userRepo, notificationService }));

    await likePost('post-1', 'user-1');

    expect(notificationService.send).not.toHaveBeenCalled();
  });
});
