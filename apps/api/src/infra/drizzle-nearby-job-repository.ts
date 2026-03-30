import { dogProfiles, users } from '@pawmeet/db';
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ActiveNearbyUser, NearbyJobRepository } from '../ports/nearby-job-repository.js';

export class DrizzleNearbyJobRepository implements NearbyJobRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findActiveUsersWithLocation(
    activeThreshold: Date,
    limit: number,
  ): Promise<ActiveNearbyUser[]> {
    const activeUsers = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        latitude: users.latitude,
        longitude: users.longitude,
        searchRadiusKm: users.searchRadiusKm,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          isNotNull(users.pushToken),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          gt(users.locationUpdatedAt, activeThreshold),
          sql`COALESCE((${users.notificationPrefs}->>'nearby')::boolean, true) = true`,
        ),
      )
      .limit(limit);

    return activeUsers as ActiveNearbyUser[];
  }

  async countNearbyUsersWithDogs(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<number> {
    const nearbyCount = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(
        dogProfiles,
        and(eq(dogProfiles.ownerId, users.id), eq(dogProfiles.isActive, true)),
      )
      .where(
        and(
          eq(users.isActive, true),
          sql`${users.id} != ${userId}`,
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`ST_DWithin(
            ST_Point(${users.longitude}, ${users.latitude})::geography,
            ST_Point(${lng}, ${lat})::geography,
            ${radiusKm * 1000}
          )`,
        ),
      );

    return nearbyCount[0]?.count ?? 0;
  }
}
