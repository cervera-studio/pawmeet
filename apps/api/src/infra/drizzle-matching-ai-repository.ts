import type { MatchInteractionType } from '@pawmeet/config';
import {
  matchInteractions,
  swipeScoreLogs,
  userActivityWindows,
  userMatchingPreferences,
} from '@pawmeet/db';
import type {
  MatchInteraction,
  SwipeScoreLog,
  UserActivityWindow,
  UserMatchingPreferences,
} from '@pawmeet/types';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { MatchingAiRepository } from '../ports/matching-ai-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}

export class DrizzleMatchingAiRepository implements MatchingAiRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  // ── Swipe Score Logs ─────────────────────────────────────────────────────

  async createSwipeScoreLog(input: {
    swiperDogId: string;
    swipedDogId: string;
    direction: 'like' | 'pass';
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
    overallScore: number;
  }): Promise<SwipeScoreLog> {
    const rows = await this.db.insert(swipeScoreLogs).values(input).returning();
    return firstRow<SwipeScoreLog>(rows);
  }

  async findSwipeScoreLogsByDog(
    dogId: string,
    options: { limit?: number; cursor?: string | null } = {},
  ): Promise<{ logs: SwipeScoreLog[]; nextCursor: string | null }> {
    const limit = options.limit ?? 50;
    const baseWhere = eq(swipeScoreLogs.swiperDogId, dogId);

    let whereClause = baseWhere;
    if (options.cursor) {
      const parsed = decodeCursor(options.cursor);
      if (parsed) {
        whereClause = and(
          baseWhere,
          or(
            lt(swipeScoreLogs.createdAt, parsed.createdAt),
            and(eq(swipeScoreLogs.createdAt, parsed.createdAt), lt(swipeScoreLogs.id, parsed.id)),
          ),
        )!;
      }
    }

    const rows = await this.db
      .select()
      .from(swipeScoreLogs)
      .where(whereClause)
      .orderBy(desc(swipeScoreLogs.createdAt), desc(swipeScoreLogs.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor(lastRow.createdAt as Date, lastRow.id)
        : null;

    return { logs: rowsAs<SwipeScoreLog>(pageRows), nextCursor };
  }

  // ── User Matching Preferences ────────────────────────────────────────────

  async findUserPreferences(userId: string): Promise<UserMatchingPreferences | null> {
    const rows = await this.db
      .select()
      .from(userMatchingPreferences)
      .where(eq(userMatchingPreferences.userId, userId));
    return firstRowOrNull<UserMatchingPreferences>(rows);
  }

  async upsertUserPreferences(input: {
    userId: string;
    weightSize: number;
    weightEnergy: number;
    weightBehavior: number;
    weightWalk: number;
    weightDistance: number;
    weightLeash: number;
    sampleSize: number;
    successRate: number;
  }): Promise<UserMatchingPreferences> {
    const rows = await this.db
      .insert(userMatchingPreferences)
      .values(input)
      .onConflictDoUpdate({
        target: userMatchingPreferences.userId,
        set: {
          weightSize: input.weightSize,
          weightEnergy: input.weightEnergy,
          weightBehavior: input.weightBehavior,
          weightWalk: input.weightWalk,
          weightDistance: input.weightDistance,
          weightLeash: input.weightLeash,
          sampleSize: input.sampleSize,
          successRate: input.successRate,
          updatedAt: new Date(),
        },
      })
      .returning();
    return firstRow<UserMatchingPreferences>(rows);
  }

  // ── Match Interactions ───────────────────────────────────────────────────

  async createMatchInteraction(input: {
    matchId: string;
    userId: string;
    interactionType: MatchInteractionType;
    metadata?: Record<string, unknown>;
  }): Promise<MatchInteraction> {
    const rows = await this.db
      .insert(matchInteractions)
      .values({
        matchId: input.matchId,
        userId: input.userId,
        interactionType: input.interactionType,
        metadata: input.metadata ?? null,
      })
      .returning();
    return firstRow<MatchInteraction>(rows);
  }

  async findInteractionsByMatches(matchIds: string[]): Promise<MatchInteraction[]> {
    if (matchIds.length === 0) return [];

    const rows = await this.db
      .select()
      .from(matchInteractions)
      .where(inArray(matchInteractions.matchId, matchIds));
    return rowsAs<MatchInteraction>(rows);
  }

  // ── User Activity Windows ────────────────────────────────────────────────

  async upsertActivityWindow(input: {
    userId: string;
    dayOfWeek: number;
    hourOfDay: number;
  }): Promise<UserActivityWindow> {
    const rows = await this.db
      .insert(userActivityWindows)
      .values(input)
      .onConflictDoUpdate({
        target: [
          userActivityWindows.userId,
          userActivityWindows.dayOfWeek,
          userActivityWindows.hourOfDay,
        ],
        set: {
          activityCount: sql`${userActivityWindows.activityCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return firstRow<UserActivityWindow>(rows);
  }

  async findActivityWindowsByUser(userId: string): Promise<UserActivityWindow[]> {
    const rows = await this.db
      .select()
      .from(userActivityWindows)
      .where(eq(userActivityWindows.userId, userId))
      .orderBy(desc(userActivityWindows.activityCount));
    return rowsAs<UserActivityWindow>(rows);
  }

  async findNearbyActivityWindows(
    excludeUserId: string,
    dayOfWeek: number,
    hourOfDay: number,
  ): Promise<Array<{ userId: string; activityCount: number }>> {
    const rows = await this.db
      .select({
        userId: userActivityWindows.userId,
        activityCount: userActivityWindows.activityCount,
      })
      .from(userActivityWindows)
      .where(
        and(
          eq(userActivityWindows.dayOfWeek, dayOfWeek),
          eq(userActivityWindows.hourOfDay, hourOfDay),
          sql`${userActivityWindows.userId} != ${excludeUserId}`,
        ),
      );
    return rows;
  }
}
