import {
  BEHAVIOR_WITH_DOGS,
  BEHAVIOR_WITH_PEOPLE,
  DOG_SIZE,
  ENERGY_LEVEL,
  GENDER,
  LEASH_BEHAVIOR,
  RECALL_RELIABILITY,
  WALK_TERRAIN,
  WALK_TIME,
} from '@pawmeet/config';
import type { DogProfile } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  calculateSizeScore: () => 0.8,
  calculateEnergyScore: () => 0.7,
  calculateBehaviorScore: () => 0.9,
  calculateDistanceScore: () => 0.6,
  calculateWeightedScore: () => 0.75,
  blendWeights: vi.fn(),
}));

vi.mock('../domain/compatibility-scoring.js', () => ({
  calculateLeashScore: () => 0.85,
  calculateWalkScore: () => 0.65,
}));

import type { CompatibilityBreakdown, RuleBasedStrategy } from '../domain/scoring-strategy.js';
import type { OnnxModelLoader } from './onnx-model-loader.js';
import { MLScoringStrategy } from './ml-scoring-strategy.js';

function buildDogProfile(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'owner-1',
    name: 'Buddy',
    birthDate: new Date('2022-01-15'),
    breed: 'Labrador',
    breedSecondary: null,
    size: DOG_SIZE.MEDIUM,
    weightKg: 25,
    gender: GENDER.MALE,
    isNeutered: true,
    energyLevel: ENERGY_LEVEL.HIGH,
    behaviorWithDogs: BEHAVIOR_WITH_DOGS.FRIENDLY,
    behaviorWithPeople: BEHAVIOR_WITH_PEOPLE.FRIENDLY,
    leashBehavior: LEASH_BEHAVIOR.GOOD,
    recallReliability: RECALL_RELIABILITY.PARTIAL,
    bio: null,
    walkPrefTime: [WALK_TIME.MORNING],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 90,
    walkPrefTerrain: [WALK_TERRAIN.PARK],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies DogProfile;
}

function buildFallback(): RuleBasedStrategy {
  return {
    name: 'rule_based',
    score: vi.fn<RuleBasedStrategy['score']>().mockResolvedValue({
      sizeScore: 0.5,
      energyScore: 0.5,
      behaviorScore: 0.5,
      walkScore: 0.5,
      distanceScore: 0.5,
      leashScore: 0.5,
      overallScore: 0.5,
    }),
  } satisfies RuleBasedStrategy;
}

function buildModelLoader(overrides: Partial<OnnxModelLoader> = {}): OnnxModelLoader {
  return {
    isReady: vi.fn().mockReturnValue(true),
    predict: vi.fn().mockResolvedValue(0.82),
    initialize: vi.fn(),
    shutdown: vi.fn(),
    getVersion: vi.fn().mockReturnValue('v1'),
    ...overrides,
  } as unknown as OnnxModelLoader;
}

describe('MLScoringStrategy', () => {
  let fallback: RuleBasedStrategy;
  let modelLoader: OnnxModelLoader;
  let strategy: MLScoringStrategy;

  const dogA = buildDogProfile({ id: 'dog-a' });
  const dogB = buildDogProfile({ id: 'dog-b' });

  beforeEach(() => {
    vi.clearAllMocks();
    fallback = buildFallback();
    modelLoader = buildModelLoader();
    strategy = new MLScoringStrategy(modelLoader, fallback);
  });

  it('has name "ml_v1"', () => {
    expect(strategy.name).toBe('ml_v1');
  });

  it('falls back to rule-based when model is not ready', async () => {
    modelLoader = buildModelLoader({ isReady: vi.fn().mockReturnValue(false) });
    strategy = new MLScoringStrategy(modelLoader, fallback);

    const result = await strategy.score(dogA, dogB, 5);
    expect(fallback.score).toHaveBeenCalledWith(dogA, dogB, 5, undefined);
    expect(result.overallScore).toBe(0.5);
  });

  it('falls back when dog features are missing from Redis', async () => {
    mockRedisGet.mockResolvedValue(null);

    const result = await strategy.score(dogA, dogB, 5);
    expect(fallback.score).toHaveBeenCalled();
    expect(result.overallScore).toBe(0.5);
  });

  it('returns cached score when available', async () => {
    const cached: CompatibilityBreakdown = {
      sizeScore: 0.9,
      energyScore: 0.9,
      behaviorScore: 0.9,
      walkScore: 0.9,
      distanceScore: 0.9,
      leashScore: 0.9,
      overallScore: 0.95,
    };

    mockRedisGet.mockImplementation((key: string) => {
      if (key === `ml:features:dog:${dogA.id}`) return { ageMonths: 24, isNeutered: 1 };
      if (key === `ml:features:dog:${dogB.id}`) return { ageMonths: 36, isNeutered: 0 };
      if (key === `ml:scores:${dogA.id}:${dogB.id}`) return cached;
      return null;
    });

    const result = await strategy.score(dogA, dogB, 5);
    expect(result).toEqual(cached);
    expect(modelLoader.predict).not.toHaveBeenCalled();
  });

  it('runs ONNX inference and caches result when no cache hit', async () => {
    mockRedisGet.mockImplementation((key: string) => {
      if (key === `ml:features:dog:${dogA.id}`) return { ageMonths: 24, isNeutered: 1 };
      if (key === `ml:features:dog:${dogB.id}`) return { ageMonths: 36, isNeutered: 0 };
      return null;
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await strategy.score(dogA, dogB, 5);

    expect(modelLoader.predict).toHaveBeenCalledOnce();
    expect(result.overallScore).toBe(0.82);
    expect(mockRedisSet).toHaveBeenCalledWith(
      `ml:scores:${dogA.id}:${dogB.id}`,
      expect.objectContaining({ overallScore: 0.82 }),
      { ex: 3600 },
    );
  });

  it('clamps overallScore to [0, 1]', async () => {
    modelLoader = buildModelLoader({ predict: vi.fn().mockResolvedValue(1.5) });
    strategy = new MLScoringStrategy(modelLoader, fallback);

    mockRedisGet.mockImplementation((key: string) => {
      if (key.startsWith('ml:features:dog:')) return { ageMonths: 24, isNeutered: 1 };
      return null;
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await strategy.score(dogA, dogB, 5);
    expect(result.overallScore).toBe(1);
  });

  it('clamps negative scores to 0', async () => {
    modelLoader = buildModelLoader({ predict: vi.fn().mockResolvedValue(-0.3) });
    strategy = new MLScoringStrategy(modelLoader, fallback);

    mockRedisGet.mockImplementation((key: string) => {
      if (key.startsWith('ml:features:dog:')) return { ageMonths: 24, isNeutered: 1 };
      return null;
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await strategy.score(dogA, dogB, 5);
    expect(result.overallScore).toBe(0);
  });

  it('appends user features when userId is provided', async () => {
    mockRedisGet.mockImplementation((key: string) => {
      if (key.startsWith('ml:features:dog:')) return { ageMonths: 24, isNeutered: 1 };
      if (key === 'ml:features:user:user-1')
        return {
          likeRate: 0.6,
          matchSuccessRate: 0.4,
          avgChatMessages: 12,
          walkCompletionRate: 0.8,
          sampleSize: 50,
        };
      return null;
    });
    mockRedisSet.mockResolvedValue('OK');

    await strategy.score(dogA, dogB, 5, 'user-1');

    const predictCall = vi.mocked(modelLoader.predict).mock.calls[0];
    const features = predictCall?.[0] ?? [];
    // Last 5 features should be user features
    expect(features.slice(-5)).toEqual([0.6, 0.4, 12, 0.8, 50]);
  });

  it('pads with zeros when user features are missing', async () => {
    mockRedisGet.mockImplementation((key: string) => {
      if (key.startsWith('ml:features:dog:')) return { ageMonths: 24, isNeutered: 1 };
      return null;
    });
    mockRedisSet.mockResolvedValue('OK');

    await strategy.score(dogA, dogB, 5, 'user-no-features');

    const predictCall = vi.mocked(modelLoader.predict).mock.calls[0];
    const features = predictCall?.[0] ?? [];
    expect(features.slice(-5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('falls back to rule-based on inference error', async () => {
    modelLoader = buildModelLoader({
      predict: vi.fn().mockRejectedValue(new Error('ONNX crash')),
    });
    strategy = new MLScoringStrategy(modelLoader, fallback);

    mockRedisGet.mockImplementation((key: string) => {
      if (key.startsWith('ml:features:dog:')) return { ageMonths: 24, isNeutered: 1 };
      return null;
    });

    const result = await strategy.score(dogA, dogB, 5);
    expect(fallback.score).toHaveBeenCalled();
    expect(result.overallScore).toBe(0.5);
  });
});
