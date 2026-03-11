import {
  AB_VARIANT,
  type AbVariant,
  AI_VARIANT_PERCENTAGE,
  type ExperimentId,
} from '@dogwalk/config';
import type { AbAssignment } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { MatchingAiRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
};

export function createGetAbAssignment({ matchingAiRepo }: Deps) {
  return async (
    userId: string,
    experimentId: ExperimentId,
  ): Promise<Result<{ assignment: AbAssignment }>> => {
    // Check existing assignment
    const existing = await matchingAiRepo.findAssignment(userId, experimentId);
    if (existing) {
      return succeed({ assignment: existing });
    }

    // Check if experiment is active
    const experiment = await matchingAiRepo.findExperiment(experimentId);
    const aiPercentage = experiment?.isActive
      ? experiment.aiVariantPercentage
      : AI_VARIANT_PERCENTAGE;

    // Deterministic assignment based on userId hash
    const variant = assignVariant(userId, aiPercentage);

    const assignment = await matchingAiRepo.createAssignment({
      userId,
      experimentId,
      variant,
    });

    return succeed({ assignment });
  };
}

/**
 * Deterministically assign a user to a variant based on their userId.
 * Uses a simple hash to ensure the same user always gets the same variant.
 */
function assignVariant(userId: string, aiPercentage: number): AbVariant {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash * 31 + char) | 0;
  }
  const bucket = Math.abs(hash) % 100;
  return bucket < aiPercentage ? AB_VARIANT.AI_ENHANCED : AB_VARIANT.RULE_BASED;
}
