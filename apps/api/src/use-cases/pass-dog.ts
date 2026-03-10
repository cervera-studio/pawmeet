import { SWIPE_DAILY_LIMIT } from '@dogwalk/config';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await matchRepo.countDailySwipes(dogId, today);
    if (dailyCount >= SWIPE_DAILY_LIMIT) {
      return fail(
        new AppError('SWIPE_LIMIT_REACHED', 'Limite giornaliero di swipe raggiunto', 429),
      );
    }

    // Check if already swiped
    const existing = await matchRepo.findSwipe(dogId, targetDogId);
    if (existing) {
      return fail(new AppError('ALREADY_SWIPED', 'Già votato per questo profilo', 409));
    }

    // Record the pass
    await matchRepo.createSwipe({ swiperDogId: dogId, swipedDogId: targetDogId, direction: 'pass' });

    return succeed({ message: 'Passato' });
  };
}
