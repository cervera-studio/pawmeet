import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
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
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.createdBy !== hostUserId) {
      return fail(
        new AppError('NOT_ORGANIZER', "Solo l'organizzatore può rifiutare le richieste", 403),
      );
    }

    const participant = await groupEventRepo.findParticipant(eventId, targetUserId);
    if (!participant || participant.status !== 'pending') {
      return fail(
        new AppError('NO_PENDING_REQUEST', 'Nessuna richiesta pendente per questo utente', 404),
      );
    }

    await groupEventRepo.updateParticipantStatus(eventId, targetUserId, 'declined');

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
