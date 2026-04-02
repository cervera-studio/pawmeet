import { HEALTH_DATA_SOURCE } from '@pawmeet/config';
import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildActivityRepo, buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createGetDogHealthGoal } from './get-dog-health-goal.js';

describe('createGetDogHealthGoal', () => {
  it('returns health goal with progress for a large dog', async () => {
    const dog = buildDog({ id: 'dog-1', ownerId: 'user-1', size: 'large' });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(dog),
    });
    // Simulate 7 days of history: 45 min/day avg = 315 total
    const history = Array.from({ length: 7 }, (_, i) => ({
      id: `act-${i}`,
      userId: 'user-1',
      date: `2026-03-${String(4 + i).padStart(2, '0')}`,
      stepsCount: 5000,
      walkDistanceKm: 3,
      walkDurationMin: 45,
      walkCount: 1,
      source: HEALTH_DATA_SOURCE.APP,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const activityRepo = buildActivityRepo({
      getDailyHistory: vi.fn().mockResolvedValue(history),
    });

    const getDogHealthGoal = createGetDogHealthGoal({ dogRepo, activityRepo });
    const result = await getDogHealthGoal('user-1', { dogId: 'dog-1' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // large dog = 75 min recommended, current avg = 45 min => progress = 45/75 = 0.6
    expect(result.data.goal.sizeCategory).toBe('large');
    expect(result.data.goal.recommendedDailyMinutes).toBe(75);
    expect(result.data.goal.currentDailyAvgMinutes).toBe(45);
    expect(result.data.goal.goalProgress).toBe(0.6);
  });

  it('fails when dog is not found', async () => {
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const activityRepo = buildActivityRepo();

    const getDogHealthGoal = createGetDogHealthGoal({ dogRepo, activityRepo });
    const result = await getDogHealthGoal('user-1', { dogId: 'dog-1' });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails when dog belongs to another user', async () => {
    const dog = buildDog({ id: 'dog-1', ownerId: 'user-2' });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(dog),
    });
    const activityRepo = buildActivityRepo();

    const getDogHealthGoal = createGetDogHealthGoal({ dogRepo, activityRepo });
    const result = await getDogHealthGoal('user-1', { dogId: 'dog-1' });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('DOG_NOT_OWNED');
  });
});
