import type { MatchInteractionType } from '@pawmeet/config';
import type { MatchInteraction } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { MatchingAiRepository, MatchRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
  matchRepo: MatchRepository;
};

export function createRecordMatchInteraction({ matchingAiRepo, matchRepo }: Deps) {
  return async (
    userId: string,
    matchId: string,
    interactionType: MatchInteractionType,
    metadata?: Record<string, unknown>,
  ): Promise<Result<{ interaction: MatchInteraction }>> => {
    const match = await matchRepo.findById(matchId);
    if (!match) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match not found', 404));
    }

    const interaction = await matchingAiRepo.createMatchInteraction({
      matchId,
      userId,
      interactionType,
      metadata,
    });

    return succeed({ interaction });
  };
}
