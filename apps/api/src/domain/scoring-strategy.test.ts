import {
  BEHAVIOR_WITH_DOGS,
  DOG_SIZE,
  ENERGY_LEVEL,
  LEASH_BEHAVIOR,
  WALK_TERRAIN,
  WALK_TIME,
} from '@pawmeet/config';
import { describe, expect, it, vi } from 'vitest';
import type { MatchingAiRepository } from '../ports/index.js';
import { buildDog } from '../test-utils/builders.js';
import { getScoreBreakdown, RuleBasedStrategy } from './scoring-strategy.js';

const dogA = buildDog({
  id: 'dog-a',
  size: DOG_SIZE.LARGE,
  energyLevel: ENERGY_LEVEL.HIGH,
  behaviorWithDogs: BEHAVIOR_WITH_DOGS.FRIENDLY,
  leashBehavior: LEASH_BEHAVIOR.GOOD,
  walkPrefTime: [WALK_TIME.MORNING],
  walkPrefDurationMin: 30,
  walkPrefDurationMax: 60,
  walkPrefTerrain: [WALK_TERRAIN.PARK],
});

const dogB = buildDog({
  id: 'dog-b',
  size: DOG_SIZE.MEDIUM,
  energyLevel: ENERGY_LEVEL.MEDIUM,
  behaviorWithDogs: BEHAVIOR_WITH_DOGS.SELECTIVE,
  leashBehavior: LEASH_BEHAVIOR.EXCELLENT,
  walkPrefTime: [WALK_TIME.MORNING, WALK_TIME.AFTERNOON],
  walkPrefDurationMin: 20,
  walkPrefDurationMax: 50,
  walkPrefTerrain: [WALK_TERRAIN.PARK, WALK_TERRAIN.URBAN],
});

describe('getScoreBreakdown', () => {
  it('returns all six sub-scores', () => {
    const breakdown = getScoreBreakdown(dogA, dogB, 5);
    expect(breakdown).toHaveProperty('sizeScore');
    expect(breakdown).toHaveProperty('energyScore');
    expect(breakdown).toHaveProperty('behaviorScore');
    expect(breakdown).toHaveProperty('walkScore');
    expect(breakdown).toHaveProperty('distanceScore');
    expect(breakdown).toHaveProperty('leashScore');
  });

  it('returns scores in [0, 1]', () => {
    const breakdown = getScoreBreakdown(dogA, dogB, 5);
    for (const value of Object.values(breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('RuleBasedStrategy', () => {
  it('has name "rule_based"', () => {
    const strategy = new RuleBasedStrategy();
    expect(strategy.name).toBe('rule_based');
  });

  it('scores two dogs without AI repo (default weights)', async () => {
    const strategy = new RuleBasedStrategy();
    const result = await strategy.score(dogA, dogB, 5);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(result).toHaveProperty('sizeScore');
    expect(result).toHaveProperty('energyScore');
    expect(result).toHaveProperty('behaviorScore');
    expect(result).toHaveProperty('walkScore');
    expect(result).toHaveProperty('distanceScore');
    expect(result).toHaveProperty('leashScore');
  });

  it('uses default weights when no userId is provided', async () => {
    const mockRepo = {
      findUserPreferences: vi.fn(),
    } satisfies Partial<MatchingAiRepository> as unknown as MatchingAiRepository;

    const strategy = new RuleBasedStrategy(mockRepo);
    await strategy.score(dogA, dogB, 5);

    expect(mockRepo.findUserPreferences).not.toHaveBeenCalled();
  });

  it('fetches user preferences when userId and repo are provided', async () => {
    const mockRepo = {
      findUserPreferences: vi.fn().mockResolvedValue(null),
    } satisfies Partial<MatchingAiRepository> as unknown as MatchingAiRepository;

    const strategy = new RuleBasedStrategy(mockRepo);
    await strategy.score(dogA, dogB, 5, 'user-1');

    expect(mockRepo.findUserPreferences).toHaveBeenCalledWith('user-1');
  });

  it('returns identical dogs with high overall score', async () => {
    const strategy = new RuleBasedStrategy();
    const identical = buildDog();
    const result = await strategy.score(identical, identical, 0);

    expect(result.overallScore).toBeGreaterThanOrEqual(0.9);
  });
});
