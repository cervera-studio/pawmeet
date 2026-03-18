import type { DogProfile } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';

import {
  type CompatibilityBreakdown,
  getScoreBreakdown,
  type RuleBasedStrategy,
  type ScoringStrategy,
} from '../domain/scoring-strategy.js';
import { redis } from '../lib/redis.js';
import type { OnnxModelLoader } from './onnx-model-loader.js';

// ── ML Scoring Strategy ──────────────────────────────────────────────────────

export class MLScoringStrategy implements ScoringStrategy {
  readonly name = 'ml_v1' as const;

  constructor(
    private modelLoader: OnnxModelLoader,
    private ruleBasedFallback: RuleBasedStrategy,
  ) {}

  async score(
    dogA: DogProfile,
    dogB: DogProfile,
    distanceKm: number,
    userId?: string,
  ): Promise<CompatibilityBreakdown> {
    try {
      // If model not ready, fall back to rule-based
      if (!this.modelLoader.isReady()) {
        return this.ruleBasedFallback.score(dogA, dogB, distanceKm, userId);
      }

      // 1. Fetch precomputed features from Redis
      const [dogAFeatures, dogBFeatures] = await Promise.all([
        redis.get<Record<string, number>>(`ml:features:dog:${dogA.id}`),
        redis.get<Record<string, number>>(`ml:features:dog:${dogB.id}`),
      ]);

      if (!(dogAFeatures && dogBFeatures)) {
        return this.ruleBasedFallback.score(dogA, dogB, distanceKm, userId);
      }

      // 2. Check score cache
      const cacheKey = `ml:scores:${dogA.id}:${dogB.id}`;
      const cached = await redis.get<CompatibilityBreakdown>(cacheKey);
      if (cached) return cached;

      // 3. Build feature vector for ONNX
      const breakdown = getScoreBreakdown(dogA, dogB, distanceKm);
      const features = [
        breakdown.sizeScore,
        breakdown.energyScore,
        breakdown.behaviorScore,
        breakdown.walkScore,
        breakdown.distanceScore,
        breakdown.leashScore,
        distanceKm,
        dogAFeatures.ageMonths ?? 0,
        dogBFeatures.ageMonths ?? 0,
        Math.abs((dogAFeatures.ageMonths ?? 0) - (dogBFeatures.ageMonths ?? 0)),
        dogAFeatures.isNeutered ? 1 : 0,
        dogBFeatures.isNeutered ? 1 : 0,
      ];

      // Append user features if available
      if (userId) {
        const userFeatures = await redis.get<Record<string, number>>(`ml:features:user:${userId}`);
        if (userFeatures) {
          features.push(
            userFeatures.likeRate ?? 0,
            userFeatures.matchSuccessRate ?? 0,
            userFeatures.avgChatMessages ?? 0,
            userFeatures.walkCompletionRate ?? 0,
            userFeatures.sampleSize ?? 0,
          );
        } else {
          features.push(0, 0, 0, 0, 0);
        }
      } else {
        features.push(0, 0, 0, 0, 0);
      }

      // 4. Run ONNX inference
      const overallScore = await this.modelLoader.predict(features);
      const clampedScore = Math.min(1, Math.max(0, overallScore));

      const result: CompatibilityBreakdown = {
        ...breakdown,
        overallScore: clampedScore,
      };

      // 5. Cache result (TTL 1 hour)
      await redis.set(cacheKey, result, { ex: 3600 });

      return result;
    } catch (error) {
      logger.warn('ml-scoring', 'Fallback to rule-based', { error: String(error) });
      return this.ruleBasedFallback.score(dogA, dogB, distanceKm, userId);
    }
  }
}
