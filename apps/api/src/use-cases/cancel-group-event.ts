import { AppError, fail, GROUP_EVENT_STATUS, type Result, succeed } from '@pawmeet/types';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { canTransitionTo } from '../domain/group-event-state-machine.js';
import { checkOwnership } from '../domain/ownership.js';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants' | 'updateStatus'>;
};

export function createCancelGroupEvent({ groupEventRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const event = await groupEventRepo.findByIdWithParticipants(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    const ownershipError = checkOwnership(
      event.createdBy,
      userId,
      'NOT_ORGANIZER',
      'Only the organizer can cancel the event',
    );
    if (ownershipError) return fail(ownershipError);

    if (!canTransitionTo(event.status, GROUP_EVENT_STATUS.CANCELLED)) {
      return fail(
        new AppError(
          'INVALID_STATUS_TRANSITION',
          `Impossibile annullare un evento con stato "${event.status}"`,
          400,
        ),
      );
    }

    await groupEventRepo.updateStatus(eventId, GROUP_EVENT_STATUS.CANCELLED);

    // Emit domain event — notifications handled by event handler
    const otherParticipantIds = event.participants
      .filter((p) => p.userId !== userId)
      .map((p) => p.userId);

    void emit({
      type: DOMAIN_EVENT.GROUP_EVENT_CANCELLED,
      payload: {
        eventId,
        userId,
        eventTitle: event.title,
        participantUserIds: otherParticipantIds,
      },
      timestamp: new Date(),
    });

    return succeed(undefined);
  };
}
