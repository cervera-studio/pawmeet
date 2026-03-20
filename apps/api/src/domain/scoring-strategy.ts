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

// ── Scoring helpers ──────────────────────────────────────────────────────────

const LEASH_SCORES: Record<string, number> = {
  excellent: 1.0,
  good: 0.7,
  in_training: 0.4,
  difficult: 0.1,
};

function calculateLeashScore(a: string, b: string): number {
  const scoreA = LEASH_SCORES[a] ?? 0.5;
  const scoreB = LEASH_SCORES[b] ?? 0.5;
  return 1 - Math.abs(scoreA - scoreB);
}

function calculateWalkScore(
  dogA: {
    walkPrefTime: string[];
    walkPrefDurationMin: number;
    walkPrefDurationMax: number;
    walkPrefTerrain: string[];
  },
  dogB: {
    walkPrefTime: string[];
    walkPrefDurationMin: number;
    walkPrefDurationMax: number;
    walkPrefTerrain: string[];
  },
): number {
  const timeSetA = new Set(dogA.walkPrefTime);
  const timeOverlap = dogB.walkPrefTime.filter((t) => timeSetA.has(t)).length;
  const timeTotal = new Set([...dogA.walkPrefTime, ...dogB.walkPrefTime]).size;
  const timeScore = timeTotal > 0 ? timeOverlap / timeTotal : 0;

  const overlapMin = Math.max(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const overlapMax = Math.min(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const unionMin = Math.min(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const unionMax = Math.max(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const durationScore =
    unionMax > unionMin ? Math.max(0, overlapMax - overlapMin) / (unionMax - unionMin) : 0;

  const terrainSetA = new Set(dogA.walkPrefTerrain);
  const terrainOverlap = dogB.walkPrefTerrain.filter((t) => terrainSetA.has(t)).length;
  const terrainTotal = new Set([...dogA.walkPrefTerrain, ...dogB.walkPrefTerrain]).size;
  const terrainScore = terrainTotal > 0 ? terrainOverlap / terrainTotal : 0;

  return (timeScore + durationScore + terrainScore) / 3;
}

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
