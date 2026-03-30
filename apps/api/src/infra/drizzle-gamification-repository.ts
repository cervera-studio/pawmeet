import type { AchievementType, ChallengeType, LeaderboardType, XpAction } from '@pawmeet/config';
import { computeLevelFromXp, LEADERBOARD_TYPE } from '@pawmeet/config';
import {
  achievements,
  challenges,
  dogProfiles,
  groupEventParticipants,
  matches,
  streaks,
  userChallenges,
  users,
  walks,
  xpTransactions,
} from '@pawmeet/db';
import type {
  Achievement,
  Challenge,
  LeaderboardEntry,
  Streak,
  UserChallenge,
  XpTransaction,
} from '@pawmeet/types';
import { and, count, desc, eq, gte, inArray, lt, lte, or, sql, sum } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleGamificationRepository implements GamificationRepository {
  constructor(private readonly db: NodePgDatabase) {}

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
    return firstRow<XpTransaction>(rows);
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

    const query = whereClause ? baseQuery.where(whereClause) : baseQuery;

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
    return rowsAs<Challenge>(rows);
  }

  async findUserChallenges(userId: string, challengeIds: string[]): Promise<UserChallenge[]> {
    if (challengeIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(userChallenges)
      .where(
        and(eq(userChallenges.userId, userId), inArray(userChallenges.challengeId, challengeIds)),
      );
    return rowsAs<UserChallenge>(rows);
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
    return firstRow<UserChallenge>(rows);
  }

  async findActiveChallengesByType(type: ChallengeType, now: Date): Promise<Challenge[]> {
    const rows = await this.db
      .select()
      .from(challenges)
      .where(
        and(eq(challenges.type, type), lte(challenges.startsAt, now), gte(challenges.endsAt, now)),
      );
    return rowsAs<Challenge>(rows);
  }

  async createChallenge(data: {
    type: string;
    title: string;
    description: string;
    targetValue: number;
    xpReward: number;
    startsAt: Date;
    endsAt: Date;
  }): Promise<Challenge> {
    const rows = await this.db.insert(challenges).values(data).returning();
    return firstRow<Challenge>(rows);
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  async findAchievementsByUser(userId: string): Promise<Achievement[]> {
    const rows = await this.db.select().from(achievements).where(eq(achievements.userId, userId));
    return rowsAs<Achievement>(rows);
  }

  async hasAchievement(userId: string, type: AchievementType): Promise<boolean> {
    const rows = await this.db
      .select({ id: achievements.id })
      .from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.type, type)));
    return rows.length > 0;
  }

  async unlockAchievement(userId: string, type: AchievementType): Promise<Achievement> {
    const rows = await this.db.insert(achievements).values({ userId, type }).returning();
    return firstRow<Achievement>(rows);
  }

  // ── Streaks ──────────────────────────────────────────────────────────────

  async getStreak(userId: string, type: string): Promise<Streak | null> {
    const rows = await this.db
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.type, type)));
    return firstRowOrNull<Streak>(rows);
  }

  async upsertStreak(
    userId: string,
    type: string,
    data: { currentLength: number; longestLength: number; lastActivityDate: Date },
  ): Promise<Streak> {
    const rows = await this.db
      .insert(streaks)
      .values({
        userId,
        type,
        currentLength: data.currentLength,
        longestLength: data.longestLength,
        lastActivityDate: data.lastActivityDate.toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [streaks.userId, streaks.type],
        set: {
          currentLength: data.currentLength,
          longestLength: data.longestLength,
          lastActivityDate: data.lastActivityDate.toISOString().slice(0, 10),
          updatedAt: new Date(),
        },
      })
      .returning();
    return firstRow<Streak>(rows);
  }

  async findStreaksOlderThan(date: Date): Promise<Streak[]> {
    const dateStr = date.toISOString().slice(0, 10);
    const rows = await this.db
      .select()
      .from(streaks)
      .where(and(lt(streaks.lastActivityDate, dateStr), sql`${streaks.currentLength} > 0`));
    return rowsAs<Streak>(rows);
  }

  async breakStreak(streakId: string): Promise<void> {
    await this.db
      .update(streaks)
      .set({ currentLength: 0, updatedAt: new Date() })
      .where(eq(streaks.id, streakId));
  }

  // ── Admin challenge management ────────────────────────────────────────────

  async listAllChallenges(
    limit: number,
    offset: number,
  ): Promise<{ data: Challenge[]; total: number }> {
    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(challenges)
        .orderBy(desc(challenges.startsAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(challenges),
    ]);
    return { data: rowsAs<Challenge>(rows), total: countResult[0]?.count ?? 0 };
  }

  async updateChallenge(
    challengeId: string,
    data: {
      title?: string;
      description?: string;
      targetValue?: number;
      xpReward?: number;
      startsAt?: Date;
      endsAt?: Date;
    },
  ): Promise<Challenge> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.targetValue !== undefined) updates.targetValue = data.targetValue;
    if (data.xpReward !== undefined) updates.xpReward = data.xpReward;
    if (data.startsAt !== undefined) updates.startsAt = data.startsAt;
    if (data.endsAt !== undefined) updates.endsAt = data.endsAt;

    const [row] = await this.db
      .update(challenges)
      .set(updates)
      .where(eq(challenges.id, challengeId))
      .returning();

    return row as Challenge;
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    await this.db.delete(challenges).where(eq(challenges.id, challengeId));
  }

  // ── Aggregate fitness stats (admin) ─────────────────────────────────────

  async getAggregateFitnessStats(): Promise<{
    totalWalks: number;
    avgDistanceKm: number;
    totalDistanceKm: number;
    topWalkers: { userId: string; displayName: string | null; totalKm: number }[];
  }> {
    const [statsResult, topWalkersResult] = await Promise.all([
      this.db
        .select({
          totalWalks: sql<number>`count(*)::int`,
          totalDistanceKm: sql<number>`coalesce(sum(${walks.durationMin}::numeric / 60 * 4), 0)::float`,
          avgDistanceKm: sql<number>`coalesce(avg(${walks.durationMin}::numeric / 60 * 4), 0)::float`,
        })
        .from(walks)
        .where(eq(walks.status, 'completed')),
      this.db
        .select({
          userId: walks.createdBy,
          displayName: users.displayName,
          totalKm: sql<number>`coalesce(sum(${walks.durationMin}::numeric / 60 * 4), 0)::float`.as(
            'total_km',
          ),
        })
        .from(walks)
        .innerJoin(users, eq(walks.createdBy, users.id))
        .where(eq(walks.status, 'completed'))
        .groupBy(walks.createdBy, users.displayName)
        .orderBy(desc(sql`total_km`))
        .limit(10),
    ]);

    const stats = statsResult[0];

    return {
      totalWalks: stats?.totalWalks ?? 0,
      avgDistanceKm: Math.round((stats?.avgDistanceKm ?? 0) * 100) / 100,
      totalDistanceKm: Math.round((stats?.totalDistanceKm ?? 0) * 100) / 100,
      topWalkers: topWalkersResult.map((r) => ({
        userId: r.userId,
        displayName: r.displayName,
        totalKm: Math.round(r.totalKm * 100) / 100,
      })),
    };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async countCompletedWalks(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(walks)
      .where(and(eq(walks.createdBy, userId), eq(walks.status, 'completed')));
    return result[0]?.count ?? 0;
  }

  async countMatches(userId: string): Promise<number> {
    // Count matches where user owns either dog A or dog B
    const result = await this.db
      .select({ count: count() })
      .from(matches)
      .innerJoin(
        dogProfiles,
        or(eq(matches.dogAId, dogProfiles.id), eq(matches.dogBId, dogProfiles.id)),
      )
      .where(and(eq(dogProfiles.ownerId, userId), eq(matches.isActive, true)));
    return result[0]?.count ?? 0;
  }

  async countGroupEventsJoined(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
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
