import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  PARTICIPANT_STATUS,
  type Result,
  succeed,
} from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { NOTIF_PROMOTED_FROM_WAITLIST } from '../constants/notifications.js';
import type { GroupEventParticipationRepository, GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> &
    Pick<
      GroupEventParticipationRepository,
      'findParticipant' | 'removeParticipant' | 'promoteFromWaitlist'
    >;
  notificationService: NotificationService;
};

export function createLeaveGroupEvent({ groupEventRepo, notificationService }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<void>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    if (event.createdBy === userId) {
      return fail(
        new AppError(
          'ORGANIZER_CANNOT_LEAVE',
          'The organizer cannot leave the event. Cancel it instead.',
          400,
        ),
      );
    }

    const participant = await groupEventRepo.findParticipant(eventId, userId);
    if (!participant) {
      return fail(new AppError('NOT_PARTICIPANT', ERROR_MESSAGES.NOT_PARTICIPANT, 404));
    }

    const wasAccepted = participant.status === PARTICIPANT_STATUS.ACCEPTED;
    await groupEventRepo.removeParticipant(eventId, userId);

    // If someone left an active event, promote from waitlist
    if (wasAccepted && event.status === GROUP_EVENT_STATUS.SCHEDULED) {
      const promoted = await groupEventRepo.promoteFromWaitlist(eventId);
      if (promoted) {
        notificationService
          .send({
            userId: promoted.userId,
            title: NOTIF_PROMOTED_FROM_WAITLIST.title,
            body: NOTIF_PROMOTED_FROM_WAITLIST.body(event.title),
          })
          .catch((err) => {
            logger.error('leave-group-event', 'Failed to send notification', err);
          });
      }
    }

    return succeed(undefined);
  };
}
