import {
  dogProfiles,
  messages,
  swipeScoreLogs,
  userMatchingPreferences,
  users,
  walks,
} from '@pawmeet/db';
import { avg, count, eq, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { DogFeatureRow, MlFeatureRepository } from '../ports/ml-feature-repository.js';

export class DrizzleMlFeatureRepository implements MlFeatureRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async getActiveDogsBatch(limit: number, offset: number): Promise<DogFeatureRow[]> {
    const dogs = await this.db
      .select({
        id: dogProfiles.id,
        birthDate: dogProfiles.birthDate,
        isNeutered: dogProfiles.isNeutered,
        size: dogProfiles.size,
        energyLevel: dogProfiles.energyLevel,
        behaviorWithDogs: dogProfiles.behaviorWithDogs,
        leashBehavior: dogProfiles.leashBehavior,
        walkPrefTime: dogProfiles.walkPrefTime,
        walkPrefDurationMin: dogProfiles.walkPrefDurationMin,
        walkPrefDurationMax: dogProfiles.walkPrefDurationMax,
        walkPrefTerrain: dogProfiles.walkPrefTerrain,
      })
      .from(dogProfiles)
      .where(eq(dogProfiles.isActive, true))
      .limit(limit)
      .offset(offset);

    return dogs;
  }

  async getActiveUserIdsBatch(limit: number, offset: number): Promise<{ id: string }[]> {
    const activeUsers = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true))
      .limit(limit)
      .offset(offset);

    return activeUsers;
  }

  async getUserSwipeStats(userId: string): Promise<{ total: number; likes: number }> {
    const [swipeStats] = await this.db
      .select({
        total: count(),
        likes: sql<number>`count(*) filter (where ${swipeScoreLogs.direction} = 'like')`,
      })
      .from(swipeScoreLogs)
      .innerJoin(dogProfiles, eq(swipeScoreLogs.swiperDogId, dogProfiles.id))
      .where(eq(dogProfiles.ownerId, userId));

    return {
      total: swipeStats?.total ?? 0,
      likes: Number(swipeStats?.likes ?? 0),
    };
  }

  async getUserMatchPrefs(
    userId: string,
  ): Promise<{ successRate: number; sampleSize: number } | null> {
    const [matchPrefs] = await this.db
      .select({
        successRate: userMatchingPreferences.successRate,
        sampleSize: userMatchingPreferences.sampleSize,
      })
      .from(userMatchingPreferences)
      .where(eq(userMatchingPreferences.userId, userId));

    return matchPrefs ?? null;
  }

  async getUserAvgMessages(userId: string): Promise<number> {
    const [msgStats] = await this.db
      .select({
        avgMessages: avg(sql<number>`msg_count`),
      })
      .from(
        this.db
          .select({
            matchId: messages.matchId,
            msg_count: count().as('msg_count'),
          })
          .from(messages)
          .where(eq(messages.senderId, userId))
          .groupBy(messages.matchId)
          .as('msg_per_match'),
      );

    return Number(msgStats?.avgMessages ?? 0);
  }

  async getUserWalkStats(userId: string): Promise<{ total: number; completed: number }> {
    const [walkStats] = await this.db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${walks.status} = 'completed')`,
      })
      .from(walks)
      .where(eq(walks.createdBy, userId));

    return {
      total: walkStats?.total ?? 0,
      completed: Number(walkStats?.completed ?? 0),
    };
  }
}
