import { postMedia } from '@pawmeet/db';
import type { PostMedia } from '@pawmeet/types';
import { count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AddPostMediaInput, FeedMediaRepository } from '../../ports/feed-repository.js';

export class DrizzleFeedMediaRepository implements FeedMediaRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async addMedia(input: AddPostMediaInput): Promise<PostMedia> {
    const rows = await this.db.insert(postMedia).values(input).returning();
    return rows[0] as PostMedia;
  }

  async findMediaByPost(postId: string): Promise<PostMedia[]> {
    return (await this.db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId))
      .orderBy(postMedia.position)) as PostMedia[];
  }

  async countMediaByPost(postId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(postMedia)
      .where(eq(postMedia.postId, postId));
    return row?.count ?? 0;
  }

  async updateMediaModerationStatus(
    mediaId: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    await this.db
      .update(postMedia)
      .set({ moderationStatus: status })
      .where(eq(postMedia.id, mediaId));
  }
}
