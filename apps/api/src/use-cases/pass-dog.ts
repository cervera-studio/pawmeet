import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import { checkDailySwipeLimit } from '../lib/swipe-limit.js';
import type { DogRepository, MatchRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
};

export function createPassDog({ dogRepo, matchRepo }: Deps) {
  return async (
    userId: string,
    dogId: string,
    targetDogId: string,
  ): Promise<Result<{ message: string }>> => {
    // Verify ownership
    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Check daily swipe limit
    const limitResult = await checkDailySwipeLimit(matchRepo, dogId);
    if (limitResult) return limitResult;

    // Check if already swiped
    const existing = await matchRepo.findSwipe(dogId, targetDogId);
    if (existing) {
      return fail(new AppError('ALREADY_SWIPED', 'Già votato per questo profilo', 409));
    }

    // Record the pass
    await matchRepo.createSwipe({
      swiperDogId: dogId,
      swipedDogId: targetDogId,
      direction: 'pass',
    });

    return succeed({ message: 'Passato' });
  };
}
