import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { DogRepository, MatchRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
};

export function createUnmatch({ dogRepo, matchRepo }: Deps) {
  return async (
    userId: string,
    matchId: string,
  ): Promise<Result<{ message: string; matchAgeDays: number }>> => {
    // Find the match
    const match = await matchRepo.findById(matchId);
    if (!match || !match.isActive) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    // Verify the user owns one of the dogs in the match
    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!dogIds.has(match.dogAId) && !dogIds.has(match.dogBId)) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    // Soft-delete the match
    await matchRepo.softDelete(matchId);

    const matchAgeDays = Math.floor(
      (Date.now() - new Date(match.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    return succeed({ message: 'Match annullato', matchAgeDays });
  };
}
