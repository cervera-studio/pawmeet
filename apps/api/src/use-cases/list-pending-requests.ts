import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { assertOwnership } from '../domain/ownership.js';
import type {
  GroupEventParticipationRepository,
  GroupEventRepository,
  PendingParticipant,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> &
    Pick<GroupEventParticipationRepository, 'findPendingParticipants'>;
};

export function createListPendingRequests({ groupEventRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<PendingParticipant[]>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    assertOwnership(
      event.createdBy,
      userId,
      'NOT_ORGANIZER',
      'Only the organizer can view pending requests',
    );

    const pending = await groupEventRepo.findPendingParticipants(eventId);
    return succeed(pending);
  };
}
