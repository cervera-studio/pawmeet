import { contentReactions } from '@pawmeet/db';
import type { ContentReaction, ContentType } from '@pawmeet/types';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FeedReactionRepository } from '../../ports/feed-repository.js';

export class DrizzleFeedReactionRepository implements FeedReactionRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async addReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<ContentReaction> {
    const rows = await this.db
      .insert(contentReactions)
      .values({ contentType, contentId, userId, emoji })
      .returning();
    return rows[0] as ContentReaction;
  }

  async removeReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.db
      .delete(contentReactions)
      .where(
        and(
          eq(contentReactions.contentType, contentType),
          eq(contentReactions.contentId, contentId),
          eq(contentReactions.userId, userId),
          eq(contentReactions.emoji, emoji),
        ),
      );
  }
}
