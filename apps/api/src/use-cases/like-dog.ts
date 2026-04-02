import type { Match } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { NOTIF_NEW_MATCH } from '../constants/notifications.js';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { hasLocation } from '../domain/type-guards.js';
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

async function notifyMatchRecipient(
  notificationService: NotificationService,
  userRepo: UserRepository,
  targetDog: { ownerId: string; name: string },
  matchId: string,
): Promise<void> {
  const recipient = await userRepo.findById(targetDog.ownerId);
  if (!recipient) return;
  if (recipient.notificationPrefs?.matches === false) return;

  notificationService
    .send({
      userId: targetDog.ownerId,
      title: NOTIF_NEW_MATCH.title,
      body: NOTIF_NEW_MATCH.body(targetDog.name),
      data: { matchId, type: 'new_match' },
    })
    .catch((err) => logger.error('likeDog', 'Failed to enqueue match notification', err));
}

async function computeOwnerDistance(
  userRepo: UserRepository,
  userId: string,
  targetOwnerId: string,
): Promise<number | undefined> {
  const [myUser, otherUser] = await Promise.all([
    userRepo.findById(userId),
    userRepo.findById(targetOwnerId),
  ]);
  if (!(myUser && hasLocation(myUser) && otherUser && hasLocation(otherUser))) return;
  return haversineKm(myUser.latitude, myUser.longitude, otherUser.latitude, otherUser.longitude);
}

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
    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    const limitResult = await checkDailySwipeLimit(matchRepo, dogId);
    if (limitResult) return limitResult;

    const existing = await matchRepo.findSwipe(dogId, targetDogId);
    if (existing) {
      return fail(new AppError('ALREADY_SWIPED', ERROR_MESSAGES.ALREADY_SWIPED, 409));
    }

    await matchRepo.createSwipe({
      swiperDogId: dogId,
      swipedDogId: targetDogId,
      direction: 'like',
    });

    const reciprocal = await matchRepo.findReciprocalLike(targetDogId, dogId);
    if (!reciprocal) {
      return succeed({ isMatch: false });
    }

    // Normalize pair order (dogAId < dogBId) to satisfy the unique constraint
    const [normalizedA, normalizedB] =
      dogId < targetDogId ? [dogId, targetDogId] : [targetDogId, dogId];

    const match = await matchRepo.create({
      dogAId: normalizedA,
      dogBId: normalizedB,
      compatibilityScore: 0,
    });

    const targetDog = await dogRepo.findById(targetDogId);
    if (targetDog) {
      await notifyMatchRecipient(notificationService, userRepo, targetDog, match.id);
    }

    const distanceKm = targetDog
      ? await computeOwnerDistance(userRepo, userId, targetDog.ownerId)
      : undefined;

    void emit({
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: {
        matchId: match.id,
        userId,
        compatibilityScore: match.compatibilityScore,
        distanceKm,
        sizePair: targetDog ? `${myDog.size}-${targetDog.size}` : undefined,
        energyPair: targetDog ? `${myDog.energyLevel}-${targetDog.energyLevel}` : undefined,
      },
      timestamp: new Date(),
    });

    return succeed({
      match,
      isMatch: true,
      sizePair: targetDog ? `${myDog.size}-${targetDog.size}` : undefined,
      energyPair: targetDog ? `${myDog.energyLevel}-${targetDog.energyLevel}` : undefined,
      distanceKm,
    });
  };
}
