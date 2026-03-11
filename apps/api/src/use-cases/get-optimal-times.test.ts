import { describe, expect, it, vi } from 'vitest';
import type { MatchingAiRepository } from '../ports/index.js';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createGetOptimalTimes } from './get-optimal-times.js';

function buildMatchingAiRepo(overrides: Partial<MatchingAiRepository> = {}): MatchingAiRepository {
  return {
    createSwipeScoreLog: vi.fn(),
    findSwipeScoreLogsByDog: vi.fn().mockResolvedValue([]),
    findUserPreferences: vi.fn().mockResolvedValue(null),
    upsertUserPreferences: vi.fn(),
    createMatchInteraction: vi.fn(),
    findInteractionsByMatches: vi.fn().mockResolvedValue([]),
    upsertActivityWindow: vi.fn(),
    findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
    findNearbyActivityWindows: vi.fn().mockResolvedValue([]),
    findExperiment: vi.fn().mockResolvedValue(null),
    findAssignment: vi.fn().mockResolvedValue(null),
    createAssignment: vi.fn(),
    ...overrides,
  };
}

describe('getOptimalTimes', () => {
  it('returns empty when user has no activity windows', async () => {
    const dog = buildDog();
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(dog) });
    const matchingAiRepo = buildMatchingAiRepo();

    const getOptimalTimes = createGetOptimalTimes({ matchingAiRepo, dogRepo });
    const result = await getOptimalTimes('user-1', 'dog-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.windows).toEqual([]);
    }
  });

  it('returns ranked time windows based on user and nearby activity', async () => {
    const dog = buildDog();
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(dog) });

    const matchingAiRepo = buildMatchingAiRepo({
      findActivityWindowsByUser: vi.fn().mockResolvedValue([
        {
          id: 'w1',
          userId: 'user-1',
          dayOfWeek: 1,
          hourOfDay: 9,
          activityCount: 8,
          updatedAt: new Date(),
        },
        {
          id: 'w2',
          userId: 'user-1',
          dayOfWeek: 3,
          hourOfDay: 17,
          activityCount: 5,
          updatedAt: new Date(),
        },
        {
          id: 'w3',
          userId: 'user-1',
          dayOfWeek: 5,
          hourOfDay: 7,
          activityCount: 1,
          updatedAt: new Date(),
        },
      ]),
      findNearbyActivityWindows: vi
        .fn()
        .mockResolvedValueOnce([
          { userId: 'user-2', activityCount: 5 },
          { userId: 'user-3', activityCount: 3 },
          { userId: 'user-4', activityCount: 7 },
        ])
        .mockResolvedValueOnce([{ userId: 'user-5', activityCount: 2 }]),
    });

    const getOptimalTimes = createGetOptimalTimes({ matchingAiRepo, dogRepo });
    const result = await getOptimalTimes('user-1', 'dog-1');

    expect(result.success).toBe(true);
    if (result.success) {
      // Window w3 filtered out (activityCount < 3)
      expect(result.data.windows).toHaveLength(2);
      // Monday 9am should rank higher (3 nearby users vs 1)
      expect(result.data.windows[0].dayOfWeek).toBe(1);
      expect(result.data.windows[0].nearbyActiveUsers).toBe(3);
    }
  });

  it('fails when dog not found', async () => {
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(null) });
    const matchingAiRepo = buildMatchingAiRepo();

    const getOptimalTimes = createGetOptimalTimes({ matchingAiRepo, dogRepo });
    const result = await getOptimalTimes('user-1', 'dog-wrong');

    expect(result.success).toBe(false);
  });
});
