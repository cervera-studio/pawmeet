import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildActivityRepo } from '../test-utils/builders.js';
import { createGetActivityStats } from './get-activity-stats.js';

describe('createGetActivityStats', () => {
  it('returns weekly summary for a given date', async () => {
    const weeklySummary = {
      totalSteps: 35000,
      totalDistanceKm: 25,
      totalDurationMin: 300,
      totalWalks: 7,
      avgDailySteps: 5000,
      avgDailyDistanceKm: 3.57,
      avgDailyDurationMin: 43,
      days: [],
    };
    const activityRepo = buildActivityRepo({
      getWeeklySummary: vi.fn().mockResolvedValue(weeklySummary),
    });

    const getActivityStats = createGetActivityStats({ activityRepo });
    const result = await getActivityStats('user-1', { period: 'week', date: '2026-03-10' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.summary.totalSteps).toBe(35000);
    // 2026-03-10 is a Tuesday, so week start (Monday) = 2026-03-09
    expect(activityRepo.getWeeklySummary).toHaveBeenCalledWith('user-1', '2026-03-09');
  });

  it('returns monthly summary for a given date', async () => {
    const monthlySummary = {
      totalSteps: 150000,
      totalDistanceKm: 100,
      totalDurationMin: 1200,
      totalWalks: 30,
      avgDailySteps: 5000,
      avgDailyDistanceKm: 3.33,
      avgDailyDurationMin: 40,
      days: [],
    };
    const activityRepo = buildActivityRepo({
      getMonthlySummary: vi.fn().mockResolvedValue(monthlySummary),
    });

    const getActivityStats = createGetActivityStats({ activityRepo });
    const result = await getActivityStats('user-1', { period: 'month', date: '2026-03-15' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.summary.totalWalks).toBe(30);
    expect(activityRepo.getMonthlySummary).toHaveBeenCalledWith('user-1', '2026-03-01');
  });
});
