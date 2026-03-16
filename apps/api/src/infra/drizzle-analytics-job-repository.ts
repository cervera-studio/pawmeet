import { analyticsDailyMetrics, analyticsEvents } from '@pawmeet/db';
import { count, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  AnalyticsEventInsert,
  AnalyticsJobRepository,
} from '../ports/analytics-job-repository.js';

export class DrizzleAnalyticsJobRepository implements AnalyticsJobRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async insertEvents(values: AnalyticsEventInsert[]): Promise<void> {
    if (values.length === 0) return;

    await this.db
      .insert(analyticsEvents)
      .values(values)
      .onConflictDoNothing({ target: analyticsEvents.clientEventId });
  }

  async getEventCountForDay(dayStart: Date, nextDayStart: Date): Promise<number> {
    const tsFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;

    const [eventCountRow] = await this.db
      .select({ value: count() })
      .from(analyticsEvents)
      .where(tsFilter);

    return eventCountRow?.value ?? 0;
  }

  async getUniqueUsersForDay(dayStart: Date, nextDayStart: Date): Promise<number> {
    const tsFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;

    const [uniqueUsersRow] = await this.db
      .select({ value: sql<number>`count(distinct ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(sql`${tsFilter} AND ${analyticsEvents.userId} IS NOT NULL`);

    return Number(uniqueUsersRow?.value ?? 0);
  }

  async getEventCountsByName(
    dayStart: Date,
    nextDayStart: Date,
  ): Promise<{ eventName: string; value: number }[]> {
    const tsFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;

    const eventCounts = await this.db
      .select({
        eventName: analyticsEvents.eventName,
        value: count(),
      })
      .from(analyticsEvents)
      .where(tsFilter)
      .groupBy(analyticsEvents.eventName);

    return eventCounts;
  }

  async upsertDailyMetrics(
    metrics: { date: Date; metricName: string; value: number }[],
  ): Promise<void> {
    if (metrics.length === 0) return;

    await this.db
      .insert(analyticsDailyMetrics)
      .values(
        metrics.map((m) => ({
          ...m,
          date: m.date.toISOString().slice(0, 10),
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [analyticsDailyMetrics.date, analyticsDailyMetrics.metricName],
        set: {
          value: sql`EXCLUDED.value`,
          updatedAt: sql`now()`,
        },
      });
  }
}
