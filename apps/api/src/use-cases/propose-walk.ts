import { AppError, fail, type Result, succeed, WALK_STATUS } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type {
  DogRepository,
  MatchRepository,
  MessageRepository,
  NotificationService,
  UserRepository,
  WalkRepository,
} from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  messageRepo: MessageRepository;
  dogRepo: DogRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

type ProposeWalkInput = {
  matchId: string;
  scheduledAt: Date;
  durationMin: number;
  title?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export function createProposeWalk({
  walkRepo,
  matchRepo,
  messageRepo,
  dogRepo,
  userRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    input: ProposeWalkInput,
  ): Promise<
    Result<{ walkId: string; matchAgeHours: number; messageCountBeforeProposal: number }>
  > => {
    // Validate match exists and is active
    const match = await matchRepo.findById(input.matchId);
    if (!match?.isActive) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match not found', 404));
    }

    // Verify user is a participant in this match
    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!(dogIds.has(match.dogAId) || dogIds.has(match.dogBId))) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match not found', 404));
    }

    // Validate scheduledAt is in the future
    if (input.scheduledAt <= new Date()) {
      return fail(new AppError('WALK_INVALID_DATE', 'La data deve essere nel futuro', 400));
    }

    const walk = await walkRepo.create({
      matchId: input.matchId,
      createdBy: userId,
      title: input.title ?? null,
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: WALK_STATUS.PENDING,
      notes: input.notes ?? null,
    });

    // Analytics context
    const matchAgeHours = Math.floor(
      (Date.now() - new Date(match.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const messageCountBeforeProposal = await messageRepo.countByMatch(input.matchId);

    // Notify the other user about the walk proposal
    const otherDogId = dogIds.has(match.dogAId) ? match.dogBId : match.dogAId;
    const otherDogs = await dogRepo.findByIds([otherDogId]);
    const otherDog = otherDogs?.[0];
    if (otherDog) {
      const otherUser = await userRepo.findById(otherDog.ownerId);
      if (otherUser?.notificationPrefs?.reminders !== false) {
        const user = await userRepo.findById(userId);
        await notificationService.send({
          userId: otherDog.ownerId,
          title: '🐾 Nuova proposta di passeggiata',
          body: `${user?.displayName ?? 'Qualcuno'} ti ha proposto una passeggiata${input.title ? `: ${input.title}` : ''}`,
          data: { type: 'walk_proposal', walkId: walk.id },
        });
      }
    }

    logger.info('ProposeWalk', 'Walk proposed', {
      userId,
      walkId: walk.id,
      matchId: input.matchId,
    });

    return succeed({ walkId: walk.id, matchAgeHours, messageCountBeforeProposal });
  };
}
