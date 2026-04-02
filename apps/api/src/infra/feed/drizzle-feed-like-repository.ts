import { postLikes, posts } from '@pawmeet/db';
import type { PostLike } from '@pawmeet/types';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FeedLikeRepository } from '../../ports/feed-repository.js';

export class DrizzleFeedLikeRepository implements FeedLikeRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async addLike(postId: string, userId: string): Promise<PostLike> {
    return await this.db.transaction(async (tx) => {
      const rows = await tx.insert(postLikes).values({ postId, userId }).returning();
      await tx
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
      return rows[0] as PostLike;
    });
  }

  async removeLike(postId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .returning();
      if (deleted.length > 0) {
        await tx
          .update(posts)
          .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
          .where(eq(posts.id, postId));
      }
    });
  }

  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return row !== undefined;
  }
}
