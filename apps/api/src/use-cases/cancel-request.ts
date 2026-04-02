import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { GroupEventParticipationRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<
    GroupEventParticipationRepository,
    'findParticipant' | 'updateParticipantStatus'
  >;
};

export function createCancelRequest({ groupEventRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const participant = await groupEventRepo.findParticipant(eventId, userId);
    if (!participant || participant.status !== 'pending') {
      return fail(
        new AppError('NO_PENDING_REQUEST', ERROR_MESSAGES.NO_PENDING_REQUEST_TO_CANCEL, 404),
      );
    }

    await groupEventRepo.updateParticipantStatus(eventId, userId, 'cancelled');

    return succeed(undefined);
  };
}
