import { dogProfiles, swipes, userBlocks, users } from '@pawmeet/db';
import { and, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  MlRecommendationsRepository,
  NearbyCandidateRow,
  RecommendationUserRow,
} from '../ports/ml-recommendations-repository.js';

export class DrizzleMlRecommendationsRepository implements MlRecommendationsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<RecommendationUserRow[]> {
    const activeUsers = await this.db
      .select({
        id: users.id,
        latitude: users.latitude,
        longitude: users.longitude,
        searchRadiusKm: users.searchRadiusKm,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          gt(users.lastLoginAt, activeThreshold),
        ),
      )
      .limit(limit)
      .offset(offset);

    return activeUsers;
  }

  async getUserActiveDogs(userId: string): Promise<NearbyCandidateRow[]> {
    const userDogs = await this.db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    return userDogs.map((d) => ({
      id: d.id,
      ownerId: d.ownerId,
      name: d.name,
      birthDate: d.birthDate,
      breed: d.breed,
      breedSecondary: d.breedSecondary,
      size: d.size,
      weightKg: d.weightKg,
      gender: d.gender,
      isNeutered: d.isNeutered,
      energyLevel: d.energyLevel,
      behaviorWithDogs: d.behaviorWithDogs,
      behaviorWithPeople: d.behaviorWithPeople,
      leashBehavior: d.leashBehavior,
      recallReliability: d.recallReliability,
      bio: d.bio,
      walkPrefTime: d.walkPrefTime,
      walkPrefDurationMin: d.walkPrefDurationMin,
      walkPrefDurationMax: d.walkPrefDurationMax,
      walkPrefTerrain: d.walkPrefTerrain,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      ownerLatitude: null,
      ownerLongitude: null,
      distanceKm: 0,
    })) satisfies NearbyCandidateRow[];
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blockedRows = await this.db
      .select({ blockedId: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, userId));

    return blockedRows.map((r) => r.blockedId);
  }

  async getBlockerUserIds(userId: string): Promise<string[]> {
    const blockerRows = await this.db
      .select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, userId));

    return blockerRows.map((r) => r.blockerId);
  }

  async getSwipedDogIds(userDogIds: string[]): Promise<string[]> {
    if (userDogIds.length === 0) return [];

    const swipedRows = await this.db
      .select({ swipedDogId: swipes.swipedDogId })
      .from(swipes)
      .where(inArray(swipes.swiperDogId, userDogIds));

    return swipedRows.map((r) => r.swipedDogId);
  }

  async getNearbyDogsWithDistance(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbyCandidateRow[]> {
    const nearbyDogs = await this.db
      .select({
        id: dogProfiles.id,
        ownerId: dogProfiles.ownerId,
        name: dogProfiles.name,
        birthDate: dogProfiles.birthDate,
        breed: dogProfiles.breed,
        breedSecondary: dogProfiles.breedSecondary,
        size: dogProfiles.size,
        weightKg: dogProfiles.weightKg,
        gender: dogProfiles.gender,
        isNeutered: dogProfiles.isNeutered,
        energyLevel: dogProfiles.energyLevel,
        behaviorWithDogs: dogProfiles.behaviorWithDogs,
        behaviorWithPeople: dogProfiles.behaviorWithPeople,
        leashBehavior: dogProfiles.leashBehavior,
        recallReliability: dogProfiles.recallReliability,
        bio: dogProfiles.bio,
        walkPrefTime: dogProfiles.walkPrefTime,
        walkPrefDurationMin: dogProfiles.walkPrefDurationMin,
        walkPrefDurationMax: dogProfiles.walkPrefDurationMax,
        walkPrefTerrain: dogProfiles.walkPrefTerrain,
        isActive: dogProfiles.isActive,
        createdAt: dogProfiles.createdAt,
        updatedAt: dogProfiles.updatedAt,
        ownerLatitude: users.latitude,
        ownerLongitude: users.longitude,
        distanceKm: sql<number>`ST_Distance(
          ST_Point(${users.longitude}, ${users.latitude})::geography,
          ST_Point(${lng}, ${lat})::geography
        ) / 1000.0`,
      })
      .from(dogProfiles)
      .innerJoin(users, eq(dogProfiles.ownerId, users.id))
      .where(
        and(
          eq(dogProfiles.isActive, true),
          eq(users.isActive, true),
          sql`${dogProfiles.ownerId} != ${userId}`,
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`ST_DWithin(
            ST_Point(${users.longitude}, ${users.latitude})::geography,
            ST_Point(${lng}, ${lat})::geography,
            ${radiusKm * 1000}
          )`,
        ),
      );

    return nearbyDogs as NearbyCandidateRow[];
  }
}
