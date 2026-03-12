import { AppError, fail, type Result, succeed, WALK_STATUS } from '@dogwalk/types';
import type { DogRepository, MatchRepository, WalkRepository } from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
};

export function createRespondToWalk({ walkRepo, matchRepo, dogRepo }: Deps) {
  return async (
    userId: string,
    walkId: string,
    accept: boolean,
  ): Promise<Result<{ message: string; proposalAgeHours: number }>> => {
    const walk = await walkRepo.findById(walkId);
    if (!walk) {
      return fail(new AppError('WALK_NOT_FOUND', 'Passeggiata non trovata', 404));
    }

    if (walk.status !== WALK_STATUS.PENDING) {
      return fail(new AppError('WALK_NOT_PENDING', 'La passeggiata non è più in attesa', 400));
    }

    // The responder must NOT be the creator
    if (walk.createdBy === userId) {
      return fail(
        new AppError(
          'WALK_CANNOT_RESPOND_OWN',
          'Non puoi rispondere alla tua stessa proposta',
          403,
        ),
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

    const newStatus = accept ? WALK_STATUS.ACCEPTED : WALK_STATUS.DECLINED;
    await walkRepo.updateStatus(walkId, newStatus);

    // TODO: enqueue push notification to creator

    const proposalAgeHours = Math.floor(
      (Date.now() - new Date(walk.createdAt).getTime()) / (1000 * 60 * 60),
    );

    const message = accept ? 'Passeggiata accettata' : 'Passeggiata rifiutata';
    return succeed({ message, proposalAgeHours });
  };
}
