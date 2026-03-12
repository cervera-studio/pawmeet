import type { ActivitySummary, HealthGoal, Serialized } from '@pawmeet/types';

export type StatsPeriod = 'week' | 'month';

export interface ActivityRepository {
  getStats(period: StatsPeriod): Promise<{ summary: Serialized<ActivitySummary> }>;
  getDogGoal(dogId: string): Promise<{ goal: HealthGoal }>;
}
