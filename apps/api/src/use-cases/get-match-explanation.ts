import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import {
  calculateBehaviorScore,
  calculateDistance,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@pawmeet/utils';
import { hasLocation } from '../domain/type-guards.js';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';

// ── Scoring helpers (same logic as discover-candidates) ──────────────────────

const LEASH_SCORES: Record<string, number> = {
  eccellente: 1.0,
  buono: 0.7,
  in_addestramento: 0.4,
  difficile: 0.1,
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

// ── Weights from MVP spec ──────────────────────────────────────────────────────

const WEIGHT_SIZE = 0.25;
const WEIGHT_ENERGY = 0.25;
const WEIGHT_BEHAVIOR = 0.2;
const WEIGHT_WALK = 0.15;
const WEIGHT_DISTANCE = 0.1;
const WEIGHT_LEASH = 0.05;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MatchExplanation {
  overallScore: number;
  breakdown: {
    size: { score: number };
    energy: { score: number };
    behavior: { score: number };
    walk: { score: number };
    distance: { score: number };
    leash: { score: number };
  };
}

// ── Use case factory ────────────────────────────────────────────────────────

type Deps = {
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
  userRepo: UserRepository;
};

export function createGetMatchExplanation({ matchRepo, dogRepo, userRepo }: Deps) {
  return async (userId: string, matchId: string): Promise<Result<MatchExplanation>> => {
    const match = await matchRepo.findById(matchId);
    if (!match) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    const dogA = await dogRepo.findById(match.dogAId);
    const dogB = await dogRepo.findById(match.dogBId);
    if (!dogA || !dogB) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Verify user owns one of the dogs
    if (dogA.ownerId !== userId && dogB.ownerId !== userId) {
      return fail(new AppError('FORBIDDEN', 'Non autorizzato', 403));
    }

    // Get owners for distance calculation
    const ownerA = await userRepo.findById(dogA.ownerId);
    const ownerB = await userRepo.findById(dogB.ownerId);

    let distanceKm = 0;
    if (ownerA && hasLocation(ownerA) && ownerB && hasLocation(ownerB)) {
      distanceKm = calculateDistance(
        ownerA.latitude,
        ownerA.longitude,
        ownerB.latitude,
        ownerB.longitude,
      );
    }

    // Calculate all scores using the same scoring functions
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

    return succeed({
      overallScore: Math.round(overallScore * 100) / 100,
      breakdown: {
        size: { score: Math.round(sizeScore * 100) / 100 },
        energy: { score: Math.round(energyScore * 100) / 100 },
        behavior: { score: Math.round(behaviorScore * 100) / 100 },
        walk: { score: Math.round(walkScore * 100) / 100 },
        distance: { score: Math.round(distanceScore * 100) / 100 },
        leash: { score: Math.round(leashScore * 100) / 100 },
      },
    });
  };
}
