import type { ScoreBreakdown, UserMatchingPreferences } from '@pawmeet/types';

export interface MatchingWeights {
  size: number;
  energy: number;
  behavior: number;
  walk: number;
  distance: number;
  leash: number;
}

/** Default weights matching the rule-based algorithm */
const DEFAULTS: MatchingWeights = {
  size: 0.25,
  energy: 0.25,
  behavior: 0.2,
  walk: 0.15,
  distance: 0.1,
  leash: 0.05,
};

/**
 * Blend default weights with learned user preferences.
 * @param userPrefs - Learned preferences (null = use defaults)
 * @param minSwipes - Minimum swipes before learning applies (default 15)
 * @param maxBlend - Maximum blend factor for learned weights (default 0.6)
 */
export function blendWeights(
  userPrefs: UserMatchingPreferences | null,
  minSwipes = 15,
  maxBlend = 0.6,
): MatchingWeights {
  if (!userPrefs || userPrefs.sampleSize < minSwipes) {
    return { ...DEFAULTS };
  }

  // Confidence increases with sample size, caps at 1.0 at 50 swipes
  const sampleConfidence = Math.min(userPrefs.sampleSize / 50, 1);
  const blend = maxBlend * sampleConfidence;

  const learned: MatchingWeights = {
    size: userPrefs.weightSize,
    energy: userPrefs.weightEnergy,
    behavior: userPrefs.weightBehavior,
    walk: userPrefs.weightWalk,
    distance: userPrefs.weightDistance,
    leash: userPrefs.weightLeash,
  };

  const blended: MatchingWeights = {
    size: DEFAULTS.size * (1 - blend) + learned.size * blend,
    energy: DEFAULTS.energy * (1 - blend) + learned.energy * blend,
    behavior: DEFAULTS.behavior * (1 - blend) + learned.behavior * blend,
    walk: DEFAULTS.walk * (1 - blend) + learned.walk * blend,
    distance: DEFAULTS.distance * (1 - blend) + learned.distance * blend,
    leash: DEFAULTS.leash * (1 - blend) + learned.leash * blend,
  };

  return normalizeWeights(blended);
}

/**
 * Normalize weights so they sum to 1.0.
 */
export function normalizeWeights(w: MatchingWeights): MatchingWeights {
  const total = w.size + w.energy + w.behavior + w.walk + w.distance + w.leash;
  if (total === 0) return { ...DEFAULTS };

  return {
    size: w.size / total,
    energy: w.energy / total,
    behavior: w.behavior / total,
    walk: w.walk / total,
    distance: w.distance / total,
    leash: w.leash / total,
  };
}

/**
 * Calculate weighted compatibility score using custom weights.
 */
export function calculateWeightedScore(
  scores: Omit<ScoreBreakdown, 'overallScore'>,
  weights: MatchingWeights,
): number {
  return (
    weights.size * scores.sizeScore +
    weights.energy * scores.energyScore +
    weights.behavior * scores.behaviorScore +
    weights.walk * scores.walkScore +
    weights.distance * scores.distanceScore +
    weights.leash * scores.leashScore
  );
}

/**
 * Learn user preference weights from their swipe history.
 * Computes the average score per dimension for likes vs passes,
 * then creates weights emphasizing dimensions where the user
 * discriminates most (biggest difference between like and pass averages).
 */
export function learnWeightsFromSwipes(
  swipeLogs: Array<{
    direction: 'like' | 'pass';
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
  }>,
): MatchingWeights {
  const likes = swipeLogs.filter((s) => s.direction === 'like');
  const passes = swipeLogs.filter((s) => s.direction === 'pass');

  if (likes.length === 0) return { ...DEFAULTS };

  const dimensions = ['size', 'energy', 'behavior', 'walk', 'distance', 'leash'] as const;
  const scoreKeys = {
    size: 'sizeScore',
    energy: 'energyScore',
    behavior: 'behaviorScore',
    walk: 'walkScore',
    distance: 'distanceScore',
    leash: 'leashScore',
  } as const;

  const importance: Record<string, number> = {};

  for (const dim of dimensions) {
    const key = scoreKeys[dim];
    const likeAvg = likes.reduce((sum, s) => sum + s[key], 0) / likes.length;
    const passAvg =
      passes.length > 0 ? passes.reduce((sum, s) => sum + s[key], 0) / passes.length : 0.5;

    // Higher difference = user cares more about this dimension
    // Also consider absolute like average (user prefers high scores here)
    importance[dim] = Math.max(0.01, likeAvg - passAvg + likeAvg * 0.3);
  }

  return normalizeWeights({
    size: importance.size ?? DEFAULTS.size,
    energy: importance.energy ?? DEFAULTS.energy,
    behavior: importance.behavior ?? DEFAULTS.behavior,
    walk: importance.walk ?? DEFAULTS.walk,
    distance: importance.distance ?? DEFAULTS.distance,
    leash: importance.leash ?? DEFAULTS.leash,
  });
}

/**
 * Compute match success rate from interactions.
 * A match is "successful" if it has at least one walk_completed or feedback_positive.
 */
export function computeSuccessRate(
  matchIds: string[],
  interactions: Array<{ matchId: string; interactionType: string }>,
): number {
  if (matchIds.length === 0) return 0;

  const successTypes = new Set(['walk_completed', 'feedback_positive']);
  const successfulMatches = new Set<string>();

  for (const interaction of interactions) {
    if (successTypes.has(interaction.interactionType)) {
      successfulMatches.add(interaction.matchId);
    }
  }

  return successfulMatches.size / matchIds.length;
}
