import { AppError, fail, PARTICIPANT_STATUS, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { assertOwnership } from '../domain/ownership.js';
import type { GroupEventParticipationRepository, GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> &
    Pick<GroupEventParticipationRepository, 'findParticipant' | 'updateParticipantStatus'>;
  notificationService: NotificationService;
};

export function createDeclineParticipant({ groupEventRepo, notificationService }: Deps) {
  return async (
    hostUserId: string,
    eventId: string,
    targetUserId: string,
  ): Promise<Result<void>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    assertOwnership(
      event.createdBy,
      hostUserId,
      'NOT_ORGANIZER',
      'Only the organizer can decline requests',
    );

    const participant = await groupEventRepo.findParticipant(eventId, targetUserId);
    if (!participant || participant.status !== PARTICIPANT_STATUS.PENDING) {
      return fail(
        new AppError('NO_PENDING_REQUEST', 'Nessuna richiesta pendente per questo utente', 404),
      );
    }

    await groupEventRepo.updateParticipantStatus(
      eventId,
      targetUserId,
      PARTICIPANT_STATUS.DECLINED,
    );

    notificationService
      .send({
        userId: targetUserId,
        title: 'Richiesta rifiutata',
        body: `La tua richiesta per l'evento "${event.title}" è stata rifiutata`,
        data: { eventId: event.id, type: 'event_request_declined' },
      })
      .catch((err) => {
        logger.error('decline-participant', 'Failed to send notification', err);
      });

    return succeed(undefined);
  };
}
