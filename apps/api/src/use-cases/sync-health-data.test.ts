import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildActivityRepo, buildDailyActivity } from '../test-utils/builders.js';
import { createSyncHealthData } from './sync-health-data.js';

describe('createSyncHealthData', () => {
  it('syncs entries successfully', async () => {
    const activity1 = buildDailyActivity({ date: '2026-03-10' });
    const activity2 = buildDailyActivity({ id: 'activity-2', date: '2026-03-11' });

    const activityRepo = buildActivityRepo({
      upsertDaily: vi.fn().mockResolvedValueOnce(activity1).mockResolvedValueOnce(activity2),
    });

    const syncHealthData = createSyncHealthData({ activityRepo });

    const result = await syncHealthData('user-1', {
      entries: [
        {
          date: '2026-03-10',
          stepsCount: 5000,
          walkDistanceKm: 3.5,
          walkDurationMin: 45,
          walkCount: 2,
          source: 'health_kit',
        },
        {
          date: '2026-03-11',
          stepsCount: 8000,
          walkDistanceKm: 5.2,
          walkDurationMin: 60,
          walkCount: 3,
          source: 'health_kit',
        },
      ],
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.synced).toHaveLength(2);
    expect(activityRepo.upsertDaily).toHaveBeenCalledTimes(2);
  });

  it('upserts each entry with correct data', async () => {
    const activityRepo = buildActivityRepo();
    const syncHealthData = createSyncHealthData({ activityRepo });

    await syncHealthData('user-1', {
      entries: [
        {
          date: '2026-03-10',
          stepsCount: 5000,
          walkDistanceKm: 3.5,
          walkDurationMin: 45,
          walkCount: 2,
          source: 'google_fit',
        },
      ],
    });

    expect(activityRepo.upsertDaily).toHaveBeenCalledWith('user-1', '2026-03-10', {
      stepsCount: 5000,
      walkDistanceKm: 3.5,
      walkDurationMin: 45,
      walkCount: 2,
      source: 'google_fit',
    });
  });
});
