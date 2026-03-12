import { AppError, fail, type Result, succeed, WALK_STATUS } from '@pawmeet/types';
import type {
  DogRepository,
  MatchRepository,
  MessageRepository,
  WalkRepository,
} from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  messageRepo: MessageRepository;
  dogRepo: DogRepository;
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

export function createProposeWalk({ walkRepo, matchRepo, messageRepo, dogRepo }: Deps) {
  return async (
    userId: string,
    input: ProposeWalkInput,
  ): Promise<
    Result<{ walkId: string; matchAgeHours: number; messageCountBeforeProposal: number }>
  > => {
    // Validate match exists and is active
    const match = await matchRepo.findById(input.matchId);
    if (!match || !match.isActive) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
    }

    // Verify user is a participant in this match
    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!dogIds.has(match.dogAId) && !dogIds.has(match.dogBId)) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404));
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

    // TODO: enqueue push notification to the other user

    return succeed({ walkId: walk.id, matchAgeHours, messageCountBeforeProposal });
  };
}
