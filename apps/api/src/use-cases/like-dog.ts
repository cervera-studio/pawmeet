import type { Match } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { checkDailySwipeLimit } from '../lib/swipe-limit.js';
import type {
  DogRepository,
  MatchRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';

/** Haversine distance between two coordinates in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createLikeDog({ dogRepo, matchRepo, userRepo, notificationService }: Deps) {
  return async (
    userId: string,
    dogId: string,
    targetDogId: string,
  ): Promise<
    Result<{
      match?: Match;
      isMatch: boolean;
      sizePair?: string;
      energyPair?: string;
      distanceKm?: number;
    }>
  > => {
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
      const recipient = targetDog ? await userRepo.findById(targetDog.ownerId) : null;

      if (targetDog && recipient) {
        const wantsMatchNotifs = recipient.notificationPrefs?.matches !== false;

        if (wantsMatchNotifs) {
          notificationService
            .send({
              userId: targetDog.ownerId,
              title: 'Hai un nuovo match! \u{1F415}',
              body: `Il tuo cane ${targetDog.name} ha un nuovo compagno di passeggiata!`,
              data: { matchId: match.id, type: 'new_match' },
            })
            .catch((err) => logger.error('likeDog', 'Failed to enqueue match notification', err));
        }
      }

      // Compute distance between owners if both have locations
      let distanceKm: number | undefined;
      const myUser = await userRepo.findById(userId);
      if (
        myUser?.latitude != null &&
        myUser?.longitude != null &&
        recipient?.latitude != null &&
        recipient?.longitude != null
      ) {
        distanceKm = haversineKm(
          myUser.latitude,
          myUser.longitude,
          recipient.latitude,
          recipient.longitude,
        );
      }

      return succeed({
        match,
        isMatch: true,
        sizePair: targetDog ? `${myDog.size}-${targetDog.size}` : undefined,
        energyPair: targetDog ? `${myDog.energyLevel}-${targetDog.energyLevel}` : undefined,
        distanceKm,
      });
    }

    return succeed({ isMatch: false });
  };
}
