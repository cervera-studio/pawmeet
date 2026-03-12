import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { PendingParticipant } from '../ports/group-event-repository.js';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

export function createListPendingRequests({ groupEventRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<PendingParticipant[]>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.createdBy !== userId) {
      return fail(
        new AppError('NOT_ORGANIZER', "Solo l'organizzatore può vedere le richieste pendenti", 403),
      );
    }

    const pending = await groupEventRepo.findPendingParticipants(eventId);
    return succeed(pending);
  };
}
