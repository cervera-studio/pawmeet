import type { DogProfile } from '@pawmeet/types';
import {
  blendWeights,
  calculateBehaviorScore,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
  calculateWeightedScore,
  type MatchingWeights,
} from '@pawmeet/utils';

import type { MatchingAiRepository } from '../ports/index.js';
import { calculateLeashScore, calculateWalkScore } from './compatibility-scoring.js';

// ── Interface ────────────────────────────────────────────────────────────────

export interface CompatibilityBreakdown {
  sizeScore: number;
  energyScore: number;
  behaviorScore: number;
  walkScore: number;
  distanceScore: number;
  leashScore: number;
  overallScore: number;
}

export interface ScoringStrategy {
  readonly name: 'rule_based' | 'ml_v1';
  score(
    dogA: DogProfile,
    dogB: DogProfile,
    distanceKm: number,
    userId?: string,
  ): Promise<CompatibilityBreakdown>;
}

// ── Score breakdown helper ──────────────────────────────────────────────────

export function getScoreBreakdown(dogA: DogProfile, dogB: DogProfile, distanceKm: number) {
  return {
    sizeScore: calculateSizeScore(dogA.size, dogB.size),
    energyScore: calculateEnergyScore(dogA.energyLevel, dogB.energyLevel),
    behaviorScore: calculateBehaviorScore(dogA.behaviorWithDogs, dogB.behaviorWithDogs),
    walkScore: calculateWalkScore(dogA, dogB),
    distanceScore: calculateDistanceScore(distanceKm),
    leashScore: calculateLeashScore(dogA.leashBehavior, dogB.leashBehavior),
  };
}

// ── Default weights ──────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: MatchingWeights = {
  size: 0.25,
  energy: 0.25,
  behavior: 0.2,
  walk: 0.15,
  distance: 0.1,
  leash: 0.05,
};

// ── Rule-based strategy ──────────────────────────────────────────────────────

export class RuleBasedStrategy implements ScoringStrategy {
  readonly name = 'rule_based' as const;

  constructor(private matchingAiRepo?: MatchingAiRepository) {}

  async score(
    dogA: DogProfile,
    dogB: DogProfile,
    distanceKm: number,
    userId?: string,
  ): Promise<CompatibilityBreakdown> {
    let weights: MatchingWeights;

    if (this.matchingAiRepo && userId) {
      const prefs = await this.matchingAiRepo.findUserPreferences(userId);
      weights = blendWeights(prefs);
    } else {
      weights = { ...DEFAULT_WEIGHTS };
    }

    const breakdown = getScoreBreakdown(dogA, dogB, distanceKm);
    const overallScore = calculateWeightedScore(breakdown, weights);

    return { ...breakdown, overallScore };
  }
}
