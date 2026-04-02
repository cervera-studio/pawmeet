import { dogPhotos, dogProfiles, matches, posts, reports, users } from '@pawmeet/db';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminDashboardRepository,
  DashboardStats,
  TodayDomainMetrics,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminDashboardRepository implements AdminDashboardRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      [usersCount],
      [dogsCount],
      [matchesCount],
      [activeMatchesCount],
      [pendingPhotosCount],
      [reportsCount],
      [pendingPostsCount],
      registrations,
      dailyMatches,
    ] = await Promise.all([
      this.db.select({ value: count() }).from(users),
      this.db.select({ value: count() }).from(dogProfiles),
      this.db.select({ value: count() }).from(matches),
      this.db.select({ value: count() }).from(matches).where(eq(matches.isActive, true)),
      this.db
        .select({ value: count() })
        .from(dogPhotos)
        .where(eq(dogPhotos.moderationStatus, 'pending')),
      this.db.select({ value: count() }).from(reports).where(eq(reports.status, 'pending')),
      this.db
        .select({ value: count() })
        .from(posts)
        .where(and(eq(posts.moderationStatus, 'pending'), eq(posts.isDeleted, false))),
      this.db
        .select({
          date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
        .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),
      this.db
        .select({
          date: sql<string>`to_char(${matches.createdAt}, 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(matches)
        .where(gte(matches.createdAt, thirtyDaysAgo))
        .groupBy(sql`to_char(${matches.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${matches.createdAt}, 'YYYY-MM-DD')`),
    ]);

    return {
      totalUsers: usersCount?.value ?? 0,
      totalDogs: dogsCount?.value ?? 0,
      totalMatches: matchesCount?.value ?? 0,
      activeMatches: activeMatchesCount?.value ?? 0,
      pendingPhotos: pendingPhotosCount?.value ?? 0,
      pendingReports: reportsCount?.value ?? 0,
      pendingFeedPosts: pendingPostsCount?.value ?? 0,
      userRegistrations: registrations,
      dailyMatches,
    };
  }

  async getTodayDomainMetrics(): Promise<TodayDomainMetrics> {
    const todayStart = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

    const [[regRow], [matchRow]] = await Promise.all([
      this.db.select({ value: count() }).from(users).where(gte(users.createdAt, todayStart)),
      this.db.select({ value: count() }).from(matches).where(gte(matches.createdAt, todayStart)),
    ]);

    return {
      registrationsToday: regRow?.value ?? 0,
      matchesToday: matchRow?.value ?? 0,
    };
  }
}
