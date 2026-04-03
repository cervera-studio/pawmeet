import { dogPhotos, dogProfiles, matches, swipes, users } from '@pawmeet/db';
import type { DogProfile, Match, Swipe } from '@pawmeet/types';
import { and, count, eq, gte, ne, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CandidateDog, MatchRepository } from '../ports/match-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

/** Maximum number of candidate dogs returned per discovery query */
const MAX_CANDIDATES = 100;

/** Default search radius in meters for PostGIS ST_DWithin (50 km) */
const DEFAULT_SEARCH_RADIUS_M = 50_000;

export class DrizzleMatchRepository implements MatchRepository {
  constructor(private readonly db: NodePgDatabase) {}

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
      .where(eq(swipes.swiperDogId, swiperDogId))
      .limit(5000);
    return rows.map((r) => r.swipedDogId);
  }

  async countDailySwipes(swiperDogId: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, swiperDogId), gte(swipes.createdAt, since)));
    return row?.count ?? 0;
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

  async findCandidateDogs(
    excludeOwnerId: string,
    swiperDogId: string,
    ownerLat?: number | null,
    ownerLon?: number | null,
    radiusMeters?: number,
  ): Promise<CandidateDog[]> {
    // If caller has no location, return empty — avoid full table scan
    if (ownerLat == null || ownerLon == null) {
      return [];
    }

    const radius = radiusMeters ?? DEFAULT_SEARCH_RADIUS_M;

    const rows = await this.db
      .select({
        dog: dogProfiles,
        ownerLat: users.latitude,
        ownerLon: users.longitude,
        primaryPhotoUrl: sql<string | null>`(
          SELECT ${dogPhotos.url} FROM ${dogPhotos}
          WHERE ${dogPhotos.dogId} = ${dogProfiles.id}
            AND ${dogPhotos.isPrimary} = true
            AND ${dogPhotos.moderationStatus} = 'approved'
          LIMIT 1
        )`,
      })
      .from(dogProfiles)
      .innerJoin(users, eq(dogProfiles.ownerId, users.id))
      .where(
        and(
          eq(dogProfiles.isActive, true),
          ne(dogProfiles.ownerId, excludeOwnerId),
          eq(users.isActive, true),
          // PostGIS distance filter — uses the GIST index on users
          sql`ST_DWithin(
            CAST(ST_Point(${users.longitude}, ${users.latitude}) AS geography),
            CAST(ST_Point(${ownerLon}, ${ownerLat}) AS geography),
            ${radius}
          )`,
          // Exclude dogs already swiped by this dog
          sql`NOT EXISTS (
            SELECT 1 FROM ${swipes}
            WHERE ${swipes.swiperDogId} = ${swiperDogId}
              AND ${swipes.swipedDogId} = ${dogProfiles.id}
          )`,
        ),
      )
      .limit(MAX_CANDIDATES);

    return rows.map((r) => ({
      dog: r.dog as DogProfile,
      ownerLat: r.ownerLat,
      ownerLon: r.ownerLon,
      primaryPhotoUrl: r.primaryPhotoUrl ?? null,
    }));
  }
}
