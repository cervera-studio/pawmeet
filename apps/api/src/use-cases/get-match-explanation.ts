import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import {
  calculateBehaviorScore,
  calculateDistance,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@pawmeet/utils';
import {
  calculateLeashScore,
  calculateWalkScore,
  WEIGHT_BEHAVIOR,
  WEIGHT_DISTANCE,
  WEIGHT_ENERGY,
  WEIGHT_LEASH,
  WEIGHT_SIZE,
  WEIGHT_WALK,
} from '../domain/compatibility-scoring.js';
import { hasLocation } from '../domain/type-guards.js';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';

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

    // Calculate all scores using the shared scoring functions
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
