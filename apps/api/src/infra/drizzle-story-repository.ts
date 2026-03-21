import { stories, storyViews, users } from '@pawmeet/db';
import type { Story, StoryGroup, StoryView } from '@pawmeet/types';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CreateStoryInput, StoryRepository } from '../ports/story-repository.js';

export class DrizzleStoryRepository implements StoryRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async createStory(input: CreateStoryInput): Promise<Story> {
    const rows = await this.db.insert(stories).values(input).returning();
    return rows[0] as Story;
  }

  async findById(id: string): Promise<Story | null> {
    const [row] = await this.db.select().from(stories).where(eq(stories.id, id));
    return (row as Story | undefined) ?? null;
  }

  async findActiveStoriesForFeed(userId: string): Promise<StoryGroup[]> {
    const now = new Date();

    // Get connected user IDs (same logic as feed)
    const connectedUserIds = await this.getConnectedUserIds(userId);
    const allAuthorIds = [userId, ...connectedUserIds];

    if (allAuthorIds.length === 0) return [];

    const activeStories = await this.db
      .select({
        story: stories,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(stories)
      .innerJoin(users, eq(stories.authorId, users.id))
      .where(and(inArray(stories.authorId, allAuthorIds), gt(stories.expiresAt, now)))
      .orderBy(desc(stories.createdAt));

    if (activeStories.length === 0) return [];

    // Check which stories the user has viewed
    const storyIds = activeStories.map((s) => s.story.id);
    const viewedStories = await this.db
      .select({ storyId: storyViews.storyId })
      .from(storyViews)
      .where(and(inArray(storyViews.storyId, storyIds), eq(storyViews.viewerId, userId)));
    const viewedSet = new Set(viewedStories.map((v) => v.storyId));

    // Group by author
    const groupMap = new Map<string, StoryGroup>();
    for (const row of activeStories) {
      const existing = groupMap.get(row.authorId);
      const story = row.story as Story;
      if (existing) {
        existing.stories.push(story);
        if (!viewedSet.has(story.id)) existing.hasUnviewed = true;
      } else {
        groupMap.set(row.authorId, {
          author: {
            id: row.authorId,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
          },
          stories: [story],
          hasUnviewed: !viewedSet.has(story.id),
        });
      }
    }

    // Sort: unviewed first, then by most recent story
    return [...groupMap.values()].sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });
  }

  async countTodayByAuthor(authorId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stories)
      .where(and(eq(stories.authorId, authorId), gt(stories.createdAt, startOfDay)));
    return row?.count ?? 0;
  }

  async addView(storyId: string, viewerId: string): Promise<StoryView | null> {
    try {
      const rows = await this.db
        .insert(storyViews)
        .values({ storyId, viewerId })
        .onConflictDoNothing()
        .returning();
      return (rows[0] as StoryView | undefined) ?? null;
    } catch {
      return null;
    }
  }

  async incrementViewCount(storyId: string): Promise<void> {
    await this.db
      .update(stories)
      .set({ viewCount: sql`${stories.viewCount} + 1` })
      .where(eq(stories.id, storyId));
  }

  async deleteExpiredStories(): Promise<{ deletedCount: number; mediaUrls: string[] }> {
    const now = new Date();

    // Single DELETE ... RETURNING instead of SELECT then DELETE
    const deleted = await this.db
      .delete(stories)
      .where(sql`${stories.expiresAt} <= ${now}`)
      .returning({ mediaUrl: stories.mediaUrl });

    return {
      deletedCount: deleted.length,
      mediaUrls: deleted.map((s) => s.mediaUrl),
    };
  }

  async getViewers(storyId: string) {
    return this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        viewedAt: storyViews.viewedAt,
      })
      .from(storyViews)
      .innerJoin(users, eq(storyViews.viewerId, users.id))
      .where(eq(storyViews.storyId, storyId))
      .orderBy(desc(storyViews.viewedAt));
  }

  private async getConnectedUserIds(userId: string): Promise<string[]> {
    // Single CTE query: get all connected user IDs from matches + group events
    // (same approach as DrizzleFeedRepository.getConnectedUserIds)
    const result = await this.db.execute(sql`
      WITH user_dogs AS (
        SELECT id FROM dog_profiles
        WHERE owner_id = ${userId} AND is_active = true
      ),
      match_partner_owners AS (
        SELECT DISTINCT dp.owner_id AS connected_user_id
        FROM matches m
        JOIN user_dogs ud ON (m.dog_a_id = ud.id OR m.dog_b_id = ud.id)
        JOIN dog_profiles dp ON dp.id = CASE
          WHEN m.dog_a_id = ud.id THEN m.dog_b_id
          ELSE m.dog_a_id
        END
        WHERE m.is_active = true
      ),
      event_co_participants AS (
        SELECT DISTINCT gep2.user_id AS connected_user_id
        FROM group_event_participants gep1
        JOIN group_event_participants gep2 ON gep2.event_id = gep1.event_id
        WHERE gep1.user_id = ${userId}
          AND gep2.user_id != ${userId}
      )
      SELECT connected_user_id FROM match_partner_owners
      UNION
      SELECT connected_user_id FROM event_co_participants
    `);

    return (result.rows as { connected_user_id: string }[]).map((r) => r.connected_user_id);
  }
}
