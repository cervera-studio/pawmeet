import { AppError, fail, type Result, succeed, WALK_STATUS } from '@pawmeet/types';
import type {
  DogRepository,
  MatchRepository,
  NotificationService,
  UserRepository,
  WalkRepository,
} from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createCancelWalk({
  walkRepo,
  matchRepo,
  dogRepo,
  userRepo,
  notificationService,
}: Deps) {
  return async (userId: string, walkId: string): Promise<Result<{ message: string }>> => {
    const walk = await walkRepo.findById(walkId);
    if (!walk) {
      return fail(new AppError('WALK_NOT_FOUND', 'Passeggiata non trovata', 404));
    }

    if (walk.status !== WALK_STATUS.PENDING && walk.status !== WALK_STATUS.ACCEPTED) {
      return fail(
        new AppError('WALK_CANNOT_CANCEL', 'La passeggiata non può essere annullata', 400),
      );
    }

    // Verify user is a participant in this match
    const match = await matchRepo.findById(walk.matchId);
    if (!match || !match.isActive) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!dogIds.has(match.dogAId) && !dogIds.has(match.dogBId)) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    await walkRepo.updateStatus(walkId, WALK_STATUS.CANCELLED);

    // Notify the other user about the cancellation
    const otherDogId = dogIds.has(match.dogAId) ? match.dogBId : match.dogAId;
    const otherDogs = await dogRepo.findByIds([otherDogId]);
    const otherDog = otherDogs?.[0];
    if (otherDog) {
      const otherUser = await userRepo.findById(otherDog.ownerId);
      if (otherUser?.notificationPrefs?.reminders !== false) {
        const user = await userRepo.findById(userId);
        await notificationService.send({
          userId: otherDog.ownerId,
          title: '❌ Passeggiata annullata',
          body: `${user?.displayName ?? 'Qualcuno'} ha annullato la passeggiata`,
          data: { type: 'walk_cancelled', walkId },
        });
      }
    }

    return succeed({ message: 'Passeggiata annullata' });
  };
}
