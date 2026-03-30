import { userActivityWindows, users } from '@pawmeet/db';
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  ActivityWindowRow,
  MlOptimalTimesRepository,
  NearbyActivityRow,
  UserLocationRow,
} from '../ports/ml-optimal-times-repository.js';

export class DrizzleMlOptimalTimesRepository implements MlOptimalTimesRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<UserLocationRow[]> {
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

  async getUserActivityWindows(userId: string): Promise<ActivityWindowRow[]> {
    const ownWindows = await this.db
      .select({
        dayOfWeek: userActivityWindows.dayOfWeek,
        hourOfDay: userActivityWindows.hourOfDay,
        activityCount: userActivityWindows.activityCount,
      })
      .from(userActivityWindows)
      .where(eq(userActivityWindows.userId, userId));

    return ownWindows;
  }

  async getNearbyActivityWindows(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbyActivityRow[]> {
    const nearbyActivity = await this.db
      .select({
        dayOfWeek: userActivityWindows.dayOfWeek,
        hourOfDay: userActivityWindows.hourOfDay,
        totalActivity: sql<number>`SUM(${userActivityWindows.activityCount})`,
        userCount: sql<number>`COUNT(DISTINCT ${userActivityWindows.userId})`,
      })
      .from(userActivityWindows)
      .innerJoin(users, eq(userActivityWindows.userId, users.id))
      .where(
        and(
          eq(users.isActive, true),
          sql`${userActivityWindows.userId} != ${userId}`,
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`ST_DWithin(
            ST_Point(${users.longitude}, ${users.latitude})::geography,
            ST_Point(${lng}, ${lat})::geography,
            ${radiusKm * 1000}
          )`,
        ),
      )
      .groupBy(userActivityWindows.dayOfWeek, userActivityWindows.hourOfDay);

    return nearbyActivity;
  }
}
