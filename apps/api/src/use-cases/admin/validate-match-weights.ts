import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';

interface MatchWeightsInput {
  matchWeightSize?: number;
  matchWeightEnergy?: number;
  matchWeightBehavior?: number;
  matchWeightWalk?: number;
  matchWeightDistance?: number;
  matchWeightLeash?: number;
}

export interface ValidatedMatchWeights {
  size: number;
  energy: number;
  behavior: number;
  walk: number;
  distance: number;
  leash: number;
}

/** Validate that match weights sum to 1.0 (within tolerance), filling defaults for missing values. */
export function validateMatchWeights(input: MatchWeightsInput): Result<ValidatedMatchWeights> {
  const weights: ValidatedMatchWeights = {
    size: input.matchWeightSize ?? DEFAULT_WEIGHTS.size,
    energy: input.matchWeightEnergy ?? DEFAULT_WEIGHTS.energy,
    behavior: input.matchWeightBehavior ?? DEFAULT_WEIGHTS.behavior,
    walk: input.matchWeightWalk ?? DEFAULT_WEIGHTS.walk,
    distance: input.matchWeightDistance ?? DEFAULT_WEIGHTS.distance,
    leash: input.matchWeightLeash ?? DEFAULT_WEIGHTS.leash,
  };

  const sum =
    weights.size +
    weights.energy +
    weights.behavior +
    weights.walk +
    weights.distance +
    weights.leash;

  if (Math.abs(sum - 1.0) > 0.01) {
    return fail(
      new AppError(
        'INVALID_WEIGHT_SUM',
        `Matching weights must sum to 1.0 (current sum: ${sum.toFixed(4)})`,
        400,
      ),
    );
  }

  return succeed(weights);
}
