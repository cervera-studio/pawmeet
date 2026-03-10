import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  type Result,
  succeed,
} from '@dogwalk/types';
import type { GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  notificationService: NotificationService;
};

export function createCancelGroupEvent({ groupEventRepo, notificationService }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const event = await groupEventRepo.findByIdWithParticipants(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.createdBy !== userId) {
      return fail(
        new AppError('NOT_ORGANIZER', "Solo l'organizzatore può annullare l'evento", 403),
      );
    }

    if (event.status === GROUP_EVENT_STATUS.CANCELLED) {
      return fail(new AppError('EVENT_ALREADY_CANCELLED', 'Evento già annullato', 400));
    }

    await groupEventRepo.updateStatus(eventId, GROUP_EVENT_STATUS.CANCELLED);

    // Notify all participants (except organizer)
    const otherParticipants = event.participants.filter((p) => p.userId !== userId);
    for (const participant of otherParticipants) {
      notificationService
        .send({
          userId: participant.userId,
          title: 'Evento annullato',
          body: `L'evento "${event.title}" è stato annullato dall'organizzatore`,
        })
        .catch((err) => {
          console.error('[cancel-group-event] Failed to send notification:', err);
        });
    }

    return succeed(undefined);
  };
}
