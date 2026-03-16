export interface AnalyticsJobRepository {
  getEventCountForDay(dayStart: Date, nextDayStart: Date): Promise<number>;
  getUniqueUsersForDay(dayStart: Date, nextDayStart: Date): Promise<number>;
  getEventCountsByName(
    dayStart: Date,
    nextDayStart: Date,
  ): Promise<{ eventName: string; value: number }[]>;
  upsertDailyMetrics(metrics: { date: Date; metricName: string; value: number }[]): Promise<void>;
}
