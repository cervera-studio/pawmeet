import {
  postComments,
  postLikes,
  postMedia,
  posts,
  stories,
  userBlocks,
  userFollows,
} from '@pawmeet/db';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GdprPost, GdprPostLike } from '../../ports/gdpr-export-repository.js';

export function createSocialQueries(db: NodePgDatabase) {
  return {
    async getPostsWithMedia(userId: string): Promise<GdprPost[]> {
      const postRows = await db
        .select({
          id: posts.id,
          caption: posts.caption,
          latitude: posts.latitude,
          longitude: posts.longitude,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(and(eq(posts.authorId, userId), eq(posts.isDeleted, false)));

      if (postRows.length === 0) return [];

      const postIds = postRows.map((p) => p.id);
      const mediaRows = await db
        .select({
          postId: postMedia.postId,
          url: postMedia.url,
          mediaType: postMedia.mediaType,
          position: postMedia.position,
        })
        .from(postMedia)
        .where(inArray(postMedia.postId, postIds));

      const mediaByPost = new Map<string, GdprPost['media']>();
      for (const m of mediaRows) {
        const arr = mediaByPost.get(m.postId) ?? [];
        arr.push({ url: m.url, mediaType: m.mediaType, position: m.position });
        mediaByPost.set(m.postId, arr);
      }

      return postRows.map((p) => ({
        caption: p.caption,
        latitude: p.latitude,
        longitude: p.longitude,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt,
        media: mediaByPost.get(p.id) ?? [],
      }));
    },

    async getPostLikes(userId: string): Promise<GdprPostLike[]> {
      return db
        .select({ postId: postLikes.postId, createdAt: postLikes.createdAt })
        .from(postLikes)
        .where(eq(postLikes.userId, userId));
    },

    async getComments(userId: string) {
      return db
        .select({
          postId: postComments.postId,
          content: postComments.content,
          createdAt: postComments.createdAt,
        })
        .from(postComments)
        .where(and(eq(postComments.authorId, userId), eq(postComments.isDeleted, false)));
    },

    async getStories(userId: string) {
      return db
        .select({
          mediaUrl: stories.mediaUrl,
          mediaType: stories.mediaType,
          viewCount: stories.viewCount,
          createdAt: stories.createdAt,
        })
        .from(stories)
        .where(eq(stories.authorId, userId));
    },

    async getFollowers(userId: string) {
      return db
        .select({ userId: userFollows.followerId, createdAt: userFollows.createdAt })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId));
    },

    async getFollowing(userId: string) {
      return db
        .select({ userId: userFollows.followingId, createdAt: userFollows.createdAt })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId));
    },

    async getBlocks(userId: string) {
      return db
        .select({ blockedUserId: userBlocks.blockedId, createdAt: userBlocks.createdAt })
        .from(userBlocks)
        .where(eq(userBlocks.blockerId, userId));
    },
  };
}
