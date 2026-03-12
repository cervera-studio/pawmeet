import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

export function createCancelRequest({ groupEventRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const participant = await groupEventRepo.findParticipant(eventId, userId);
    if (!participant || participant.status !== 'pending') {
      return fail(
        new AppError('NO_PENDING_REQUEST', 'Nessuna richiesta pendente da annullare', 404),
      );
    }

    await groupEventRepo.updateParticipantStatus(eventId, userId, 'cancelled');

    return succeed(undefined);
  };
}
