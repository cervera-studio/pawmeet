import { isSuccess, SWIPE_DIRECTION } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildExperimentService,
  buildMatch,
  buildMatchingAiRepo,
  buildMatchRepo,
} from '../test-utils/builders.js';
import { createGetMatchingInsights } from './get-matching-insights.js';

describe('createGetMatchingInsights', () => {
  it('returns insights with swipe stats, preferences, and experiment variant', async () => {
    const dog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      findByOwner: vi.fn().mockResolvedValue([dog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([buildMatch()]),
    });
    const swipeLogs = [
      { direction: SWIPE_DIRECTION.LIKE, sizeScore: 0.5, energyScore: 0.8 },
      { direction: SWIPE_DIRECTION.LIKE, sizeScore: 0.6, energyScore: 0.7 },
      { direction: SWIPE_DIRECTION.PASS, sizeScore: 0.3, energyScore: 0.2 },
    ];
    const prefs = {
      id: 'pref-1',
      userId: 'user-1',
      weightSize: 0.2,
      weightEnergy: 0.3,
      weightBehavior: 0.15,
      weightWalk: 0.15,
      weightDistance: 0.1,
      weightLeash: 0.1,
      sampleSize: 20,
      successRate: 0.8,
      updatedAt: new Date(),
    };
    const activityWindows = [
      {
        id: 'w-1',
        userId: 'user-1',
        dayOfWeek: 1,
        hourOfDay: 9,
        activityCount: 5,
        updatedAt: new Date(),
      },
    ];
    const matchingAiRepo = buildMatchingAiRepo({
      findSwipeScoreLogsByDog: vi.fn().mockResolvedValue({ logs: swipeLogs, nextCursor: null }),
      findUserPreferences: vi.fn().mockResolvedValue(prefs),
      findActivityWindowsByUser: vi.fn().mockResolvedValue(activityWindows),
    });
    const experimentService = buildExperimentService({
      checkGate: vi.fn().mockReturnValue(true),
    });

    const getInsights = createGetMatchingInsights({
      matchingAiRepo,
      matchRepo,
      dogRepo,
      experimentService,
    });
    const result = await getInsights('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.insights.totalSwipes).toBe(3);
    expect(result.data.insights.totalLikes).toBe(2);
    expect(result.data.insights.totalMatches).toBe(1);
    expect(result.data.insights.matchRate).toBe(0.5);
    expect(result.data.insights.preferredDimensions[0].dimension).toBe('energy');
    expect(result.data.insights.optimalTimes).toHaveLength(1);
    expect(result.data.insights.experimentVariant).toBe('ai_enhanced');
  });

  it('returns rule_based variant when gate is disabled', async () => {
    const dog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      findByOwner: vi.fn().mockResolvedValue([dog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([]),
    });
    const matchingAiRepo = buildMatchingAiRepo({
      findSwipeScoreLogsByDog: vi.fn().mockResolvedValue({ logs: [], nextCursor: null }),
      findUserPreferences: vi.fn().mockResolvedValue(null),
      findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
    });
    const experimentService = buildExperimentService({
      checkGate: vi.fn().mockReturnValue(false),
    });

    const getInsights = createGetMatchingInsights({
      matchingAiRepo,
      matchRepo,
      dogRepo,
      experimentService,
    });
    const result = await getInsights('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.insights.experimentVariant).toBe('rule_based');
    expect(result.data.insights.preferredDimensions).toHaveLength(0);
  });

  it('fails when dog is not found or not owned', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(null),
    });
    const matchRepo = buildMatchRepo();
    const matchingAiRepo = buildMatchingAiRepo();
    const experimentService = buildExperimentService();

    const getInsights = createGetMatchingInsights({
      matchingAiRepo,
      matchRepo,
      dogRepo,
      experimentService,
    });
    const result = await getInsights('user-1', 'dog-999');

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
