import {
  achievements,
  challenges,
  groupEventParticipants,
  matches,
  users,
  userChallenges,
  walks,
  xpTransactions,
  dogProfiles,
} from '@dogwalk/db';
import type {
  AchievementType,
  ChallengeType,
  LeaderboardType,
  XpAction,
} from '@dogwalk/config';
import { computeLevelFromXp, LEADERBOARD_TYPE } from '@dogwalk/config';
import type {
  Achievement,
  Challenge,
  LeaderboardEntry,
  UserChallenge,
  XpTransaction,
} from '@dogwalk/types';
import { and, eq, gte, lte, or, sql, sum, desc, inArray } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { GamificationRepository } from '../ports/gamification-repository.js';

export class DrizzleGamificationRepository implements GamificationRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  // ── XP ──────────────────────────────────────────────────────────────────

  async createXpTransaction(
    userId: string,
    action: XpAction,
    points: number,
    metadata?: Record<string, unknown>,
  ): Promise<XpTransaction> {
    const rows = await this.db
      .insert(xpTransactions)
      .values({ userId, action, points, metadata: metadata ?? null })
      .returning();
    return rows[0] as XpTransaction;
  }

  async getTotalXp(userId: string): Promise<number> {
    const result = await this.db
      .select({ total: sum(xpTransactions.points) })
      .from(xpTransactions)
      .where(eq(xpTransactions.userId, userId));
    return Number(result[0]?.total ?? 0);
  }

  async getLeaderboard(type: LeaderboardType, limit: number): Promise<LeaderboardEntry[]> {
    const baseQuery = this.db
      .select({
        userId: xpTransactions.userId,
        displayName: users.displayName,
        totalXp: sum(xpTransactions.points).as('total_xp'),
      })
      .from(xpTransactions)
      .innerJoin(users, eq(xpTransactions.userId, users.id));

    const whereClause =
      type === LEADERBOARD_TYPE.WEEKLY
        ? gte(xpTransactions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        : undefined;

    const query = whereClause
      ? baseQuery.where(whereClause)
      : baseQuery;

    const rows = await query
      .groupBy(xpTransactions.userId, users.displayName)
      .orderBy(desc(sql`total_xp`))
      .limit(limit);

    return rows.map((row, index) => {
      const totalXp = Number(row.totalXp ?? 0);
      const { level } = computeLevelFromXp(totalXp);
      return {
        userId: row.userId,
        displayName: row.displayName,
        totalXp,
        rank: index + 1,
        level,
      };
    });
  }

  // ── Challenges ────────────────────────────────────────────────────────────

  async findActiveChallenges(now: Date): Promise<Challenge[]> {
    const rows = await this.db
      .select()
      .from(challenges)
      .where(and(lte(challenges.startsAt, now), gte(challenges.endsAt, now)));
    return rows as Challenge[];
  }

  async findUserChallenges(userId: string, challengeIds: string[]): Promise<UserChallenge[]> {
    if (challengeIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(userChallenges)
      .where(
        and(
          eq(userChallenges.userId, userId),
          inArray(userChallenges.challengeId, challengeIds),
        ),
      );
    return rows as UserChallenge[];
  }

  async upsertUserChallenge(
    userId: string,
    challengeId: string,
    progress: number,
    completedAt: Date | null,
  ): Promise<UserChallenge> {
    const rows = await this.db
      .insert(userChallenges)
      .values({ userId, challengeId, progress, completedAt })
      .onConflictDoUpdate({
        target: [userChallenges.userId, userChallenges.challengeId],
        set: { progress, completedAt },
      })
      .returning();
    return rows[0] as UserChallenge;
  }

  async findActiveChallengesByType(type: ChallengeType, now: Date): Promise<Challenge[]> {
    const rows = await this.db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.type, type),
          lte(challenges.startsAt, now),
          gte(challenges.endsAt, now),
        ),
      );
    return rows as Challenge[];
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  async findAchievementsByUser(userId: string): Promise<Achievement[]> {
    const rows = await this.db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId));
    return rows as Achievement[];
  }

  async hasAchievement(userId: string, type: AchievementType): Promise<boolean> {
    const rows = await this.db
      .select({ id: achievements.id })
      .from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.type, type)));
    return rows.length > 0;
  }

  async unlockAchievement(userId: string, type: AchievementType): Promise<Achievement> {
    const rows = await this.db
      .insert(achievements)
      .values({ userId, type })
      .returning();
    return rows[0] as Achievement;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async countCompletedWalks(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(walks)
      .where(and(eq(walks.createdBy, userId), eq(walks.status, 'completed')));
    return result[0]?.count ?? 0;
  }

  async countMatches(userId: string): Promise<number> {
    // Count matches where user owns either dog A or dog B
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .innerJoin(dogProfiles, or(
        eq(matches.dogAId, dogProfiles.id),
        eq(matches.dogBId, dogProfiles.id),
      ))
      .where(and(eq(dogProfiles.ownerId, userId), eq(matches.isActive, true)));
    return result[0]?.count ?? 0;
  }

  async countGroupEventsJoined(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupEventParticipants)
      .where(eq(groupEventParticipants.userId, userId));
    return result[0]?.count ?? 0;
  }

  async getTotalWalkDistanceKm(userId: string): Promise<number> {
    // Walk distance is estimated from durationMin (assume ~4km/h walking speed)
    const result = await this.db
      .select({
        total: sql<number>`coalesce(sum(${walks.durationMin}::numeric / 60 * 4), 0)::float`,
      })
      .from(walks)
      .where(and(eq(walks.createdBy, userId), eq(walks.status, 'completed')));
    return result[0]?.total ?? 0;
  }
}
