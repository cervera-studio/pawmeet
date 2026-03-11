import {
  dogProfiles,
  groupEventParticipants,
  matches,
  stories,
  storyViews,
  users,
} from '@dogwalk/db';
import type { Story, StoryGroup, StoryView } from '@dogwalk/types';
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
    const expired = await this.db
      .select({ id: stories.id, mediaUrl: stories.mediaUrl })
      .from(stories)
      .where(sql`${stories.expiresAt} <= ${now}`);

    if (expired.length === 0) return { deletedCount: 0, mediaUrls: [] };

    const expiredIds = expired.map((s) => s.id);
    await this.db.delete(stories).where(inArray(stories.id, expiredIds));

    return {
      deletedCount: expired.length,
      mediaUrls: expired.map((s) => s.mediaUrl),
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
    const userDogs = await this.db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    const dogIds = userDogs.map((d) => d.id);
    if (dogIds.length === 0) return [];

    const matchPartners = await this.db
      .select({ dogAId: matches.dogAId, dogBId: matches.dogBId })
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          sql`(${matches.dogAId} = ANY(${dogIds}) OR ${matches.dogBId} = ANY(${dogIds}))`,
        ),
      );

    const partnerDogIds = new Set<string>();
    for (const m of matchPartners) {
      if (dogIds.includes(m.dogAId)) partnerDogIds.add(m.dogBId);
      if (dogIds.includes(m.dogBId)) partnerDogIds.add(m.dogAId);
    }

    const partnerDogArray = [...partnerDogIds];
    const ownerIds = new Set<string>();

    if (partnerDogArray.length > 0) {
      const owners = await this.db
        .select({ ownerId: dogProfiles.ownerId })
        .from(dogProfiles)
        .where(inArray(dogProfiles.id, partnerDogArray));
      for (const o of owners) ownerIds.add(o.ownerId);
    }

    const userEvents = await this.db
      .select({ eventId: groupEventParticipants.eventId })
      .from(groupEventParticipants)
      .where(eq(groupEventParticipants.userId, userId));

    const eventIds = userEvents.map((e) => e.eventId);
    if (eventIds.length > 0) {
      const coParticipants = await this.db
        .select({ userId: groupEventParticipants.userId })
        .from(groupEventParticipants)
        .where(inArray(groupEventParticipants.eventId, eventIds));
      for (const p of coParticipants) {
        if (p.userId !== userId) ownerIds.add(p.userId);
      }
    }

    return [...ownerIds];
  }
}
