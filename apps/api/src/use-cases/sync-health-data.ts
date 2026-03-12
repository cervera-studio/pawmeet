import type { DailyActivity, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { ActivityRepository } from '../ports/activity-repository.js';

type Deps = {
  activityRepo: ActivityRepository;
};

export function createSyncHealthData({ activityRepo }: Deps) {
  return async (
    userId: string,
    input: {
      entries: Array<{
        date: string;
        stepsCount: number;
        walkDistanceKm: number;
        walkDurationMin: number;
        walkCount: number;
        source: string;
      }>;
    },
  ): Promise<Result<{ synced: DailyActivity[] }>> => {
    const synced: DailyActivity[] = [];

    for (const entry of input.entries) {
      const activity = await activityRepo.upsertDaily(userId, entry.date, {
        stepsCount: entry.stepsCount,
        walkDistanceKm: entry.walkDistanceKm,
        walkDurationMin: entry.walkDurationMin,
        walkCount: entry.walkCount,
        source: entry.source,
      });
      synced.push(activity);
    }

    return succeed({ synced });
  };
}
