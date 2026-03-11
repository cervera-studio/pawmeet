import { dogProfiles, matches, swipes, users } from '@dogwalk/db';
import type { DogProfile, Match, Swipe } from '@dogwalk/types';
import { and, eq, gte, ne, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CandidateDog, MatchRepository } from '../ports/match-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleMatchRepository implements MatchRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findActiveByDogIds(dogIds: string[]): Promise<Match[]> {
    if (dogIds.length === 0) return [];

    const rows = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(
            ...dogIds.map((id) => eq(matches.dogAId, id)),
            ...dogIds.map((id) => eq(matches.dogBId, id)),
          ),
        ),
      );
    return rowsAs<Match>(rows);
  }

  async findById(id: string): Promise<Match | null> {
    const rows = await this.db.select().from(matches).where(eq(matches.id, id));
    return firstRowOrNull<Match>(rows);
  }

  async create(input: {
    dogAId: string;
    dogBId: string;
    compatibilityScore: number;
  }): Promise<Match> {
    const rows = await this.db.insert(matches).values(input).returning();
    return firstRow<Match>(rows);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(matches).set({ isActive: false }).where(eq(matches.id, id));
  }

  // Swipes

  async findSwipedDogIds(swiperDogId: string): Promise<string[]> {
    const rows = await this.db
      .select({ swipedDogId: swipes.swipedDogId })
      .from(swipes)
      .where(eq(swipes.swiperDogId, swiperDogId));
    return rows.map((r) => r.swipedDogId);
  }

  async countDailySwipes(swiperDogId: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ id: swipes.id })
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, swiperDogId), gte(swipes.createdAt, since)));
    return rows.length;
  }

  async findSwipe(swiperDogId: string, swipedDogId: string): Promise<Swipe | null> {
    const rows = await this.db
      .select()
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, swiperDogId), eq(swipes.swipedDogId, swipedDogId)));
    return firstRowOrNull<Swipe>(rows);
  }

  async findReciprocalLike(swiperDogId: string, swipedDogId: string): Promise<Swipe | null> {
    const rows = await this.db
      .select()
      .from(swipes)
      .where(
        and(
          eq(swipes.swiperDogId, swipedDogId),
          eq(swipes.swipedDogId, swiperDogId),
          eq(swipes.direction, 'like'),
        ),
      );
    return firstRowOrNull<Swipe>(rows);
  }

  async createSwipe(input: {
    swiperDogId: string;
    swipedDogId: string;
    direction: 'like' | 'pass';
  }): Promise<Swipe> {
    const rows = await this.db.insert(swipes).values(input).returning();
    return firstRow<Swipe>(rows);
  }

  // Discovery

  async findCandidateDogs(excludeOwnerId: string): Promise<CandidateDog[]> {
    const rows = await this.db
      .select({
        dog: dogProfiles,
        ownerLat: users.latitude,
        ownerLon: users.longitude,
      })
      .from(dogProfiles)
      .innerJoin(users, eq(dogProfiles.ownerId, users.id))
      .where(
        and(
          eq(dogProfiles.isActive, true),
          ne(dogProfiles.ownerId, excludeOwnerId),
          eq(users.isActive, true),
        ),
      );

    return rows.map((r) => ({
      dog: r.dog as DogProfile,
      ownerLat: r.ownerLat,
      ownerLon: r.ownerLon,
    }));
  }
}
