import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type {
  FeedRealtimeService,
  FeedRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
  feedRealtime: FeedRealtimeService;
};

export function createLikePost({ feedRepo, userRepo, notificationService, feedRealtime }: Deps) {
  return async (
    postId: string,
    userId: string,
  ): Promise<Result<{ liked: boolean; postAgeHours: number }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.isDeleted) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    const postAgeHours = Math.floor(
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    );

    const alreadyLiked = await feedRepo.hasLiked(postId, userId);

    if (alreadyLiked) {
      await feedRepo.removeLike(postId, userId);
      return succeed({ liked: false, postAgeHours });
    }

    await feedRepo.addLike(postId, userId);

    // Notify the post author (unless they liked their own post)
    if (post.authorId !== userId) {
      const liker = await userRepo.findById(userId);
      const likerName = liker?.displayName ?? 'Qualcuno';

      // Push notification
      const recipient = await userRepo.findById(post.authorId);
      if (recipient?.notificationPrefs?.feed !== false) {
        notificationService
          .send({
            userId: post.authorId,
            title: `${likerName} ha messo mi piace`,
            body: post.caption
              ? `Al tuo post: ${post.caption.length > 50 ? `${post.caption.slice(0, 47)}...` : post.caption}`
              : 'Al tuo post',
            data: { postId, type: 'post_like' },
          })
          .catch((err) => logger.error('likePost', 'Failed to enqueue like notification', err));
      }

      // Real-time WebSocket event
      feedRealtime.notifyPostLiked(post.authorId, postId, likerName);
    }

    return succeed({ liked: true, postAgeHours });
  };
}
