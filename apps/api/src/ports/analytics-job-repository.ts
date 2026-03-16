export interface AnalyticsEventInsert {
  clientEventId: string;
  userId: string | null;
  sessionId: string | null;
  eventName: string;
  properties: Record<string, unknown> | null;
  clientTimestamp: Date;
  platform: string;
  appVersion: string | null;
  screenName: string | null;
  schemaVersion: number;
}

export interface AnalyticsJobRepository {
  insertEvents(values: AnalyticsEventInsert[]): Promise<void>;
  getEventCountForDay(dayStart: Date, nextDayStart: Date): Promise<number>;
  getUniqueUsersForDay(dayStart: Date, nextDayStart: Date): Promise<number>;
  getEventCountsByName(
    dayStart: Date,
    nextDayStart: Date,
  ): Promise<{ eventName: string; value: number }[]>;
  upsertDailyMetrics(metrics: { date: Date; metricName: string; value: number }[]): Promise<void>;
}
