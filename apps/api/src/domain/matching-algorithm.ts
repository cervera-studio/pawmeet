import type { DogProfile } from '@pawmeet/types';
import {
  calculateBehaviorScore,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@pawmeet/utils';
import type { MatchWeights } from '@pawmeet/validation';

/**
 * Leash behavior compatibility matrix.
 */
const LEASH_MATRIX: Record<string, Record<string, number>> = {
  excellent: { excellent: 1.0, good: 0.8, in_training: 0.5, difficult: 0.2 },
  good: { excellent: 0.8, good: 1.0, in_training: 0.7, difficult: 0.3 },
  in_training: { excellent: 0.5, good: 0.7, in_training: 1.0, difficult: 0.5 },
  difficult: { excellent: 0.2, good: 0.3, in_training: 0.5, difficult: 0.6 },
};

/**
 * Walk preference overlap score.
 */
function calculateWalkScore(a: DogProfile, b: DogProfile): number {
  const timeOverlap = a.walkPrefTime.filter((t) => b.walkPrefTime.includes(t));
  const timeScore = a.walkPrefTime.length > 0 ? timeOverlap.length / a.walkPrefTime.length : 0;

  const terrainOverlap = a.walkPrefTerrain.filter((t) => b.walkPrefTerrain.includes(t));
  const terrainScore =
    a.walkPrefTerrain.length > 0 ? terrainOverlap.length / a.walkPrefTerrain.length : 0;

  const durationOverlap = Math.max(
    0,
    Math.min(a.walkPrefDurationMax, b.walkPrefDurationMax) -
      Math.max(a.walkPrefDurationMin, b.walkPrefDurationMin),
  );
  const durationRange = a.walkPrefDurationMax - a.walkPrefDurationMin;
  const durationScore = durationRange > 0 ? durationOverlap / durationRange : 0;

  return (timeScore + terrainScore + durationScore) / 3;
}

function calculateLeashScore(a: string, b: string): number {
  return LEASH_MATRIX[a]?.[b] ?? 0.5;
}

export interface CompatibilityBreakdown {
  size: number;
  energy: number;
  behavior: number;
  walk: number;
  distance: number;
  leash: number;
  overall: number;
}

/**
 * Domain service: injectable matching algorithm.
 * Pure function — no side effects, no I/O.
 */
export interface MatchingAlgorithm {
  /** Calculate compatibility between two dogs at a given distance. */
  calculate(
    dogA: DogProfile,
    dogB: DogProfile,
    distanceKm: number,
    weights: MatchWeights,
  ): CompatibilityBreakdown;
}

export function createMatchingAlgorithm(): MatchingAlgorithm {
  return {
    calculate(dogA, dogB, distanceKm, weights) {
      const size = calculateSizeScore(dogA.size, dogB.size);
      const energy = calculateEnergyScore(dogA.energyLevel, dogB.energyLevel);
      const behavior = calculateBehaviorScore(dogA.behaviorWithDogs, dogB.behaviorWithDogs);
      const walk = calculateWalkScore(dogA, dogB);
      const distance = calculateDistanceScore(distanceKm);
      const leash = calculateLeashScore(dogA.leashBehavior, dogB.leashBehavior);

      const overall =
        size * weights.size +
        energy * weights.energy +
        behavior * weights.behavior +
        walk * weights.walk +
        distance * weights.distance +
        leash * weights.leash;

      return { size, energy, behavior, walk, distance, leash, overall };
    },
  };
}
