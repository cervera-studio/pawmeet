import type { DogProfile, ScoreBreakdown } from '@pawmeet/types';
import {
  calculateBehaviorScore,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@pawmeet/utils';

// ── Weights from MVP spec ──────────────────────────────────────────────────────

export const WEIGHT_SIZE = 0.25;
export const WEIGHT_ENERGY = 0.25;
export const WEIGHT_BEHAVIOR = 0.2;
export const WEIGHT_WALK = 0.15;
export const WEIGHT_DISTANCE = 0.1;
export const WEIGHT_LEASH = 0.05;

// ── Scoring helpers ────────────────────────────────────────────────────────────

export const LEASH_SCORES: Record<string, number> = {
  eccellente: 1.0,
  buono: 0.7,
  in_addestramento: 0.4,
  difficile: 0.1,
};

export function calculateLeashScore(a: string, b: string): number {
  const scoreA = LEASH_SCORES[a] ?? 0.5;
  const scoreB = LEASH_SCORES[b] ?? 0.5;
  return 1 - Math.abs(scoreA - scoreB);
}

export function calculateWalkScore(
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
  // Time overlap
  const timeSetA = new Set(dogA.walkPrefTime);
  const timeOverlap = dogB.walkPrefTime.filter((t) => timeSetA.has(t)).length;
  const timeTotal = new Set([...dogA.walkPrefTime, ...dogB.walkPrefTime]).size;
  const timeScore = timeTotal > 0 ? timeOverlap / timeTotal : 0;

  // Duration overlap (Jaccard-style on ranges)
  const overlapMin = Math.max(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const overlapMax = Math.min(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const unionMin = Math.min(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const unionMax = Math.max(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const durationScore =
    unionMax > unionMin ? Math.max(0, overlapMax - overlapMin) / (unionMax - unionMin) : 0;

  // Terrain overlap
  const terrainSetA = new Set(dogA.walkPrefTerrain);
  const terrainOverlap = dogB.walkPrefTerrain.filter((t) => terrainSetA.has(t)).length;
  const terrainTotal = new Set([...dogA.walkPrefTerrain, ...dogB.walkPrefTerrain]).size;
  const terrainScore = terrainTotal > 0 ? terrainOverlap / terrainTotal : 0;

  return (timeScore + durationScore + terrainScore) / 3;
}

export function calculateCompatibilityScoreWithBreakdown(
  dogA: DogProfile,
  dogB: DogProfile,
  distanceKm: number,
): ScoreBreakdown {
  const sizeScore = calculateSizeScore(dogA.size, dogB.size);
  const energyScore = calculateEnergyScore(dogA.energyLevel, dogB.energyLevel);
  const behaviorScore = calculateBehaviorScore(dogA.behaviorWithDogs, dogB.behaviorWithDogs);
  const walkScore = calculateWalkScore(dogA, dogB);
  const distanceScore = calculateDistanceScore(distanceKm);
  const leashScore = calculateLeashScore(dogA.leashBehavior, dogB.leashBehavior);

  const overallScore =
    WEIGHT_SIZE * sizeScore +
    WEIGHT_ENERGY * energyScore +
    WEIGHT_BEHAVIOR * behaviorScore +
    WEIGHT_WALK * walkScore +
    WEIGHT_DISTANCE * distanceScore +
    WEIGHT_LEASH * leashScore;

  return {
    sizeScore: Math.round(sizeScore * 100) / 100,
    energyScore: Math.round(energyScore * 100) / 100,
    behaviorScore: Math.round(behaviorScore * 100) / 100,
    walkScore: Math.round(walkScore * 100) / 100,
    distanceScore: Math.round(distanceScore * 100) / 100,
    leashScore: Math.round(leashScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}
