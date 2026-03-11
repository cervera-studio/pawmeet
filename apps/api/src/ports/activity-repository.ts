import type { ActivitySummary, DailyActivity } from '@dogwalk/types';

export interface ActivityRepository {
  upsertDaily(
    userId: string,
    date: string,
    data: {
      stepsCount: number;
      walkDistanceKm: number;
      walkDurationMin: number;
      walkCount: number;
      source: string;
    },
  ): Promise<DailyActivity>;
  getWeeklySummary(userId: string, weekStart: string): Promise<ActivitySummary>;
  getMonthlySummary(userId: string, month: string): Promise<ActivitySummary>;
  getDailyHistory(userId: string, from: string, to: string): Promise<DailyActivity[]>;
}
