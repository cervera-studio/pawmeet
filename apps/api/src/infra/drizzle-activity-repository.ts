import { dailyActivity } from '@dogwalk/db';
import type { ActivitySummary, DailyActivity } from '@dogwalk/types';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { ActivityRepository } from '../ports/activity-repository.js';

export class DrizzleActivityRepository implements ActivityRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async upsertDaily(
    userId: string,
    date: string,
    data: {
      stepsCount: number;
      walkDistanceKm: number;
      walkDurationMin: number;
      walkCount: number;
      source: string;
    },
  ): Promise<DailyActivity> {
    const rows = await this.db
      .insert(dailyActivity)
      .values({
        userId,
        date,
        stepsCount: data.stepsCount,
        walkDistanceKm: data.walkDistanceKm,
        walkDurationMin: data.walkDurationMin,
        walkCount: data.walkCount,
        source: data.source,
      })
      .onConflictDoUpdate({
        target: [dailyActivity.userId, dailyActivity.date, dailyActivity.source],
        set: {
          stepsCount: sql`excluded.steps_count`,
          walkDistanceKm: sql`excluded.walk_distance_km`,
          walkDurationMin: sql`excluded.walk_duration_min`,
          walkCount: sql`excluded.walk_count`,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return rows[0] as DailyActivity;
  }

  async getWeeklySummary(userId: string, weekStart: string): Promise<ActivitySummary> {
    const weekEnd = this.addDays(weekStart, 6);
    return this.getSummary(userId, weekStart, weekEnd, 7);
  }

  async getMonthlySummary(userId: string, month: string): Promise<ActivitySummary> {
    // month is YYYY-MM-DD (first day of month), compute last day
    const start = new Date(month);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const daysInMonth = end.getDate();
    const endStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return this.getSummary(userId, month, endStr, daysInMonth);
  }

  async getDailyHistory(userId: string, from: string, to: string): Promise<DailyActivity[]> {
    const rows = await this.db
      .select()
      .from(dailyActivity)
      .where(
        and(
          eq(dailyActivity.userId, userId),
          gte(dailyActivity.date, from),
          lte(dailyActivity.date, to),
        ),
      )
      .orderBy(asc(dailyActivity.date));
    return rows as DailyActivity[];
  }

  private async getSummary(
    userId: string,
    from: string,
    to: string,
    totalDays: number,
  ): Promise<ActivitySummary> {
    const days = await this.getDailyHistory(userId, from, to);

    const totalSteps = days.reduce((sum, d) => sum + d.stepsCount, 0);
    const totalDistanceKm = days.reduce((sum, d) => sum + d.walkDistanceKm, 0);
    const totalDurationMin = days.reduce((sum, d) => sum + d.walkDurationMin, 0);
    const totalWalks = days.reduce((sum, d) => sum + d.walkCount, 0);

    return {
      totalSteps,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDurationMin,
      totalWalks,
      avgDailySteps: Math.round(totalSteps / totalDays),
      avgDailyDistanceKm: Math.round((totalDistanceKm / totalDays) * 100) / 100,
      avgDailyDurationMin: Math.round(totalDurationMin / totalDays),
      days,
    };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
