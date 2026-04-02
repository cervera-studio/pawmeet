import { COMPATIBILITY_THRESHOLD, STATSIG_GATE } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompatibilityBreakdown, ScoringStrategy } from '../domain/scoring-strategy.js';
import type { EmbeddingRepository } from '../ports/embedding-repository.js';
import type { RecommendationCacheRepository } from '../ports/recommendation-cache-repository.js';
import {
  buildCandidate,
  buildDog,
  buildDogRepo,
  buildExperimentService,
  buildMatchRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createDiscoverCandidatesAi } from './discover-candidates-ai.js';

function buildScoringStrategy(overrides: Partial<ScoringStrategy> = {}): ScoringStrategy {
  const defaultBreakdown = {
    sizeScore: 1,
    energyScore: 1,
    behaviorScore: 1,
    walkScore: 1,
    distanceScore: 0.8,
    leashScore: 1,
    overallScore: 0.85,
  } satisfies CompatibilityBreakdown;
  return {
    name: 'rule_based',
    score: vi.fn().mockResolvedValue(defaultBreakdown),
    ...overrides,
  };
}

function buildEmbeddingRepo(overrides: Partial<EmbeddingRepository> = {}): EmbeddingRepository {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    findByDogId: vi.fn().mockResolvedValue(null),
    findNearestDogIds: vi.fn().mockResolvedValue([]),
    deleteByDogId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildRecommendationCacheRepo(
  overrides: Partial<RecommendationCacheRepository> = {},
): RecommendationCacheRepository {
  return {
    getTopRecommendations: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('discoverCandidatesAi', () => {
  const userId = 'user-1';
  const dogId = 'dog-1';

  const myDog = buildDog();
  const user = buildUser();
  const candidate = buildCandidate();

  let dogRepo: ReturnType<typeof buildDogRepo>;
  let matchRepo: ReturnType<typeof buildMatchRepo>;
  let userRepo: ReturnType<typeof buildUserRepo>;
  let experimentService: ReturnType<typeof buildExperimentService>;
  let ruleBasedStrategy: ScoringStrategy;
  let mlStrategy: ScoringStrategy;
  let embeddingRepo: EmbeddingRepository;
  let recommendationCacheRepo: RecommendationCacheRepository;

  beforeEach(() => {
    dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
      findSwipedDogIds: vi.fn().mockResolvedValue([]),
    });
    userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    experimentService = buildExperimentService();
    ruleBasedStrategy = buildScoringStrategy();
    mlStrategy = buildScoringStrategy({ name: 'ml_v1' });
    embeddingRepo = buildEmbeddingRepo();
    recommendationCacheRepo = buildRecommendationCacheRepo();
  });

  function createUseCase() {
    return createDiscoverCandidatesAi({
      dogRepo,
      matchRepo,
      userRepo,
      experimentService,
      ruleBasedStrategy,
      mlStrategy,
      embeddingRepo,
      recommendationCacheRepo,
    });
  }

  it('returns scored suggestions with rule_based variant by default', async () => {
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.variant).toBe('rule_based');
    expect(result.data.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.data.suggestions[0]!.compatibilityScore).toBeGreaterThanOrEqual(
      COMPATIBILITY_THRESHOLD,
    );
  });

  it('fails when dog is not found', async () => {
    dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(null) });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails when user has no location', async () => {
    userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ latitude: null, longitude: null })),
    });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });

  it('fails when user is not found', async () => {
    userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });

  it('uses ai_enhanced variant when AI gate is enabled', async () => {
    experimentService = buildExperimentService({
      checkGate: vi.fn().mockImplementation((_userId: string, gate: string) => {
        return gate === STATSIG_GATE.AI_MATCHING;
      }),
    });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.variant).toBe('ai_enhanced');
    expect(mlStrategy.score).toHaveBeenCalled();
  });

  it('uses vector_rule_based variant when vector gate is enabled', async () => {
    experimentService = buildExperimentService({
      checkGate: vi.fn().mockImplementation((_userId: string, gate: string) => {
        return gate === STATSIG_GATE.VECTOR_MATCHING;
      }),
    });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.variant).toBe('vector_rule_based');
  });

  it('uses vector_ai_enhanced variant when both gates are enabled', async () => {
    experimentService = buildExperimentService({
      checkGate: vi.fn().mockReturnValue(true),
    });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.variant).toBe('vector_ai_enhanced');
  });

  it('filters out candidates below compatibility threshold', async () => {
    ruleBasedStrategy = buildScoringStrategy({
      score: vi.fn().mockResolvedValue({
        sizeScore: 0,
        energyScore: 0,
        behaviorScore: 0,
        walkScore: 0,
        distanceScore: 0,
        leashScore: 0,
        overallScore: 0.1,
      }),
    });
    const discover = createUseCase();
    const result = await discover(userId, dogId);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions).toHaveLength(0);
  });

  it('respects limit parameter', async () => {
    const discover = createUseCase();
    const result = await discover(userId, dogId, 1);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.length).toBeLessThanOrEqual(1);
  });
});
