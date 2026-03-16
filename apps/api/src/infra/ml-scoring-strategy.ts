import type { DogProfile } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';

import {
  type CompatibilityBreakdown,
  getScoreBreakdown,
  type RuleBasedStrategy,
  type ScoringStrategy,
} from '../domain/scoring-strategy.js';
import { redis } from '../lib/redis.js';

// ── ML Scoring Strategy ──────────────────────────────────────────────────────

export class MLScoringStrategy implements ScoringStrategy {
  readonly name = 'ml_v1' as const;

  constructor(private ruleBasedFallback: RuleBasedStrategy) {}

  async score(
    dogA: DogProfile,
    dogB: DogProfile,
    distanceKm: number,
    userId?: string,
  ): Promise<CompatibilityBreakdown> {
    try {
      // 1. Fetch precomputed features from Redis
      const [dogAFeatures, dogBFeatures] = await Promise.all([
        redis.get<Record<string, number>>(`ml:features:dog:${dogA.id}`),
        redis.get<Record<string, number>>(`ml:features:dog:${dogB.id}`),
      ]);

      // Fall back to rule-based if features aren't available
      if (!dogAFeatures || !dogBFeatures) {
        logger.info('ml-scoring', 'No precomputed features, falling back to rule-based', {
          dogAId: dogA.id,
          dogBId: dogB.id,
        });
        return this.ruleBasedFallback.score(dogA, dogB, distanceKm, userId);
      }

      // 2. Check score cache
      const cacheKey = `ml:scores:${dogA.id}:${dogB.id}`;
      const cached = await redis.get<CompatibilityBreakdown>(cacheKey);
      if (cached) return cached;

      // 3. Compute breakdown using rule-based dimensions as base
      const breakdown = getScoreBreakdown(dogA, dogB, distanceKm);

      // TODO: Replace with ONNX inference when onnxruntime-node is installed
      // For now, simulate ML scoring by applying a small perturbation to rule-based scores
      // based on the precomputed feature vectors
      const featureSignal =
        Object.values(dogAFeatures).reduce((sum, v) => sum + v, 0) +
        Object.values(dogBFeatures).reduce((sum, v) => sum + v, 0);
      const perturbation = Math.sin(featureSignal) * 0.05; // deterministic, small [-0.05, 0.05]

      const mlBreakdown: CompatibilityBreakdown = {
        sizeScore: clamp(breakdown.sizeScore + perturbation * 0.5),
        energyScore: clamp(breakdown.energyScore + perturbation * 0.3),
        behaviorScore: clamp(breakdown.behaviorScore + perturbation * 0.4),
        walkScore: clamp(breakdown.walkScore + perturbation * 0.3),
        distanceScore: clamp(breakdown.distanceScore + perturbation * 0.2),
        leashScore: clamp(breakdown.leashScore + perturbation * 0.2),
        overallScore: 0,
      };

      mlBreakdown.overallScore =
        mlBreakdown.sizeScore * 0.25 +
        mlBreakdown.energyScore * 0.25 +
        mlBreakdown.behaviorScore * 0.2 +
        mlBreakdown.walkScore * 0.15 +
        mlBreakdown.distanceScore * 0.1 +
        mlBreakdown.leashScore * 0.05;

      // 4. Cache result (TTL 1 hour)
      await redis.set(cacheKey, mlBreakdown, { ex: 3600 });

      return mlBreakdown;
    } catch (error) {
      logger.warn('ml-scoring', 'Fallback to rule-based', { error: String(error) });
      return this.ruleBasedFallback.score(dogA, dogB, distanceKm, userId);
    }
  }
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
