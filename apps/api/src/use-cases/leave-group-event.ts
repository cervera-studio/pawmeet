import { AppError, fail, GROUP_EVENT_STATUS, type Result, succeed } from '@dogwalk/types';
import type { GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  notificationService: NotificationService;
};

export function createLeaveGroupEvent({ groupEventRepo, notificationService }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.createdBy === userId) {
      return fail(
        new AppError(
          'ORGANIZER_CANNOT_LEAVE',
          "L'organizzatore non può abbandonare l'evento. Annullalo invece.",
          400,
        ),
      );
    }

    const participant = await groupEventRepo.findParticipant(eventId, userId);
    if (!participant) {
      return fail(new AppError('NOT_PARTICIPANT', 'Non sei iscritto a questo evento', 404));
    }

    const wasAccepted = participant.status === 'accepted';
    await groupEventRepo.removeParticipant(eventId, userId);

    // If someone left an active event, promote from waitlist
    if (wasAccepted && event.status === GROUP_EVENT_STATUS.SCHEDULED) {
      const promoted = await groupEventRepo.promoteFromWaitlist(eventId);
      if (promoted) {
        notificationService
          .send({
            userId: promoted.userId,
            title: 'Posto disponibile!',
            body: `Sei stato promosso dalla lista d'attesa per "${event.title}"`,
          })
          .catch((err) => {
            console.error('[leave-group-event] Failed to send notification:', err);
          });
      }
    }

    return succeed(undefined);
  };
}
