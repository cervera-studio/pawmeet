import type { Result, Walk } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { DogRepository, MatchRepository, WalkRepository } from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
};

export function createListWalksByMatch({ walkRepo, matchRepo, dogRepo }: Deps) {
  return async (userId: string, matchId: string): Promise<Result<{ walks: Walk[] }>> => {
    // Verify match exists and user is a participant
    const match = await matchRepo.findById(matchId);
    if (!match?.isActive) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!(dogIds.has(match.dogAId) || dogIds.has(match.dogBId))) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    const walks = await walkRepo.findByMatchId(matchId);
    return succeed({ walks });
  };
}
