import type { XpAction } from '@pawmeet/config';
import { MAX_POST_CAPTION } from '@pawmeet/config';
import type { Post, Result, XpSummary } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { sanitizeContent } from '../lib/sanitize.js';
import type { FeedRealtimeService, FeedRepository } from '../ports/index.js';

type AwardXpFn = (
  userId: string,
  action: XpAction,
  metadata?: Record<string, unknown>,
) => Promise<Result<{ xpAwarded: number; summary: XpSummary }>>;

type Deps = {
  feedRepo: FeedRepository;
  feedRealtime?: FeedRealtimeService;
  awardXp?: AwardXpFn;
};

export function createCreatePost({ feedRepo, feedRealtime, awardXp }: Deps) {
  return async (
    userId: string,
    input: {
      caption: string | null;
      latitude: number | null;
      longitude: number | null;
      walkId: string | null;
    },
  ): Promise<Result<{ post: Post }>> => {
    if (input.caption && input.caption.length > MAX_POST_CAPTION) {
      return fail(
        new AppError(
          'CAPTION_TOO_LONG',
          `La didascalia può avere al massimo ${MAX_POST_CAPTION} caratteri`,
          400,
        ),
      );
    }

    const post = await feedRepo.createPost({
      authorId: userId,
      caption: input.caption ? sanitizeContent(input.caption) : null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      walkId: input.walkId ?? null,
    });

    if (awardXp) {
      await awardXp(userId, 'post_created', { postId: post.id });
    }

    if (feedRealtime) {
      feedRepo
        .getConnectedUserIds(userId)
        .then((connectedUserIds) => {
          feedRealtime.notifyNewPost(userId, post.id, connectedUserIds);
        })
        .catch(() => {
          // Fire-and-forget: don't fail post creation if realtime notification fails
        });
    }

    return succeed({ post });
  };
}
