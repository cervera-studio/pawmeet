import { AppError, fail, GROUP_EVENT_STATUS, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { canTransitionTo } from '../domain/group-event-state-machine.js';
import type { GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants' | 'updateStatus'>;
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
          logger.error('cancel-group-event', 'Failed to send notification', err);
        });
    }

    return succeed(undefined);
  };
}
