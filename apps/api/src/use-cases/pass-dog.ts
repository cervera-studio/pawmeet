import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
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
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    // Check daily swipe limit
    const limitResult = await checkDailySwipeLimit(matchRepo, dogId);
    if (limitResult) return limitResult;

    // Check if already swiped
    const existing = await matchRepo.findSwipe(dogId, targetDogId);
    if (existing) {
      return fail(new AppError('ALREADY_SWIPED', ERROR_MESSAGES.ALREADY_SWIPED, 409));
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
