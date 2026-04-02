import { AppError, fail, PARTICIPANT_STATUS, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { NOTIF_EVENT_REQUEST_APPROVED } from '../constants/notifications.js';
import type { GroupEventParticipationRepository, GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> &
    Pick<GroupEventParticipationRepository, 'findParticipant' | 'updateParticipantStatus'>;
  notificationService: NotificationService;
};

export function createApproveParticipant({ groupEventRepo, notificationService }: Deps) {
  return async (
    hostUserId: string,
    eventId: string,
    targetUserId: string,
  ): Promise<Result<void>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    if (event.createdBy !== hostUserId) {
      return fail(new AppError('NOT_ORGANIZER', 'Only the organizer can approve requests', 403));
    }

    const participant = await groupEventRepo.findParticipant(eventId, targetUserId);
    if (!participant || participant.status !== PARTICIPANT_STATUS.PENDING) {
      return fail(new AppError('NO_PENDING_REQUEST', ERROR_MESSAGES.NO_PENDING_REQUEST, 404));
    }

    await groupEventRepo.updateParticipantStatus(
      eventId,
      targetUserId,
      PARTICIPANT_STATUS.ACCEPTED,
    );

    notificationService
      .send({
        userId: targetUserId,
        title: NOTIF_EVENT_REQUEST_APPROVED.title,
        body: NOTIF_EVENT_REQUEST_APPROVED.body(event.title),
        data: { eventId: event.id, type: 'event_request_approved' },
      })
      .catch((err) => {
        logger.error('approve-participant', 'Failed to send notification', err);
      });

    return succeed(undefined);
  };
}
