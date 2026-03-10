import { SWIPE_DAILY_LIMIT } from '@dogwalk/config';
import type { Match } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { enqueueNotification } from '../jobs/queue.js';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
};

export function createLikeDog({ dogRepo, matchRepo, userRepo }: Deps) {
  return async (
    userId: string,
    dogId: string,
    targetDogId: string,
  ): Promise<Result<{ match?: Match; isMatch: boolean }>> => {
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

    // Record the swipe
    await matchRepo.createSwipe({
      swiperDogId: dogId,
      swipedDogId: targetDogId,
      direction: 'like',
    });

    // Check for reciprocal like
    const reciprocal = await matchRepo.findReciprocalLike(targetDogId, dogId);
    if (reciprocal) {
      const match = await matchRepo.create({
        dogAId: dogId,
        dogBId: targetDogId,
        compatibilityScore: 0, // will be recalculated
      });

      // Notify the other dog's owner about the match (if they opted in)
      const targetDog = await dogRepo.findById(targetDogId);
      if (targetDog) {
        const recipient = await userRepo.findById(targetDog.ownerId);
        const wantsMatchNotifs = recipient?.notificationPrefs?.matches !== false;

        if (wantsMatchNotifs) {
          enqueueNotification({
            userId: targetDog.ownerId,
            title: 'Hai un nuovo match! \u{1F415}',
            body: `Il tuo cane ${targetDog.name} ha un nuovo compagno di passeggiata!`,
            data: { matchId: match.id, type: 'new_match' },
          }).catch((err) => logger.error('likeDog', 'Failed to enqueue match notification', err));
        }
      }

      return succeed({ match, isMatch: true });
    }

    return succeed({ isMatch: false });
  };
}
