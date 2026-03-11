import { describe, expect, it, vi } from 'vitest';
import type { MatchingAiRepository } from '../ports/index.js';
import { buildDog, buildDogRepo, buildMatch, buildMatchRepo } from '../test-utils/builders.js';
import { createLearnUserPreferences } from './learn-user-preferences.js';

function buildMatchingAiRepo(overrides: Partial<MatchingAiRepository> = {}): MatchingAiRepository {
  return {
    createSwipeScoreLog: vi.fn(),
    findSwipeScoreLogsByDog: vi.fn().mockResolvedValue([]),
    findUserPreferences: vi.fn().mockResolvedValue(null),
    upsertUserPreferences: vi
      .fn()
      .mockImplementation((input) =>
        Promise.resolve({ id: 'pref-1', updatedAt: new Date(), ...input }),
      ),
    createMatchInteraction: vi.fn(),
    findInteractionsByMatches: vi.fn().mockResolvedValue([]),
    upsertActivityWindow: vi.fn(),
    findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
    findNearbyActivityWindows: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('learnUserPreferences', () => {
  it('saves default weights when user has no dogs', async () => {
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([]) });
    const matchingAiRepo = buildMatchingAiRepo();
    const matchRepo = buildMatchRepo();

    const learnPrefs = createLearnUserPreferences({ matchingAiRepo, matchRepo, dogRepo });
    const result = await learnPrefs('user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferences.weightSize).toBe(0.25);
      expect(result.data.preferences.sampleSize).toBe(0);
    }
  });

  it('learns weights from swipe history with like/pass differentiation', async () => {
    const dog = buildDog();
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([dog]) });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([buildMatch()]),
    });

    // Simulate: user always likes dogs with high energy scores, passes on low energy
    const swipeLogs = [
      ...Array.from({ length: 10 }, () => ({
        direction: 'like' as const,
        sizeScore: 0.5,
        energyScore: 0.9,
        behaviorScore: 0.7,
        walkScore: 0.6,
        distanceScore: 0.8,
        leashScore: 0.5,
      })),
      ...Array.from({ length: 10 }, () => ({
        direction: 'pass' as const,
        sizeScore: 0.5,
        energyScore: 0.2,
        behaviorScore: 0.7,
        walkScore: 0.6,
        distanceScore: 0.8,
        leashScore: 0.5,
      })),
    ];

    const matchingAiRepo = buildMatchingAiRepo({
      findSwipeScoreLogsByDog: vi.fn().mockResolvedValue(swipeLogs),
      findInteractionsByMatches: vi
        .fn()
        .mockResolvedValue([{ matchId: 'match-1', interactionType: 'walk_completed' }]),
    });

    const learnPrefs = createLearnUserPreferences({ matchingAiRepo, matchRepo, dogRepo });
    const result = await learnPrefs('user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      // Energy should have the highest weight since it's the most discriminative dimension
      expect(result.data.preferences.weightEnergy).toBeGreaterThan(
        result.data.preferences.weightSize,
      );
      expect(result.data.preferences.sampleSize).toBe(20);
      expect(result.data.preferences.successRate).toBe(1); // 1 match, 1 success
    }
  });
});
