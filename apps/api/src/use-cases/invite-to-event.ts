import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  PARTICIPANT_STATUS,
  type Result,
  succeed,
} from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { NOTIF_EVENT_INVITE } from '../constants/notifications.js';
import { checkOwnership } from '../domain/ownership.js';
import type {
  DogRepository,
  GroupEventParticipationRepository,
  GroupEventRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants'> &
    Pick<GroupEventParticipationRepository, 'addParticipant'>;
  userRepo: UserRepository;
  dogRepo: DogRepository;
  notificationService: NotificationService;
};

export function createInviteToEvent({
  groupEventRepo,
  userRepo,
  dogRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    eventId: string,
    invitedUserId: string,
  ): Promise<Result<{ message: string }>> => {
    const event = await groupEventRepo.findByIdWithParticipants(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    // Only the creator can invite
    const ownershipError = checkOwnership(
      event.createdBy,
      userId,
      'NOT_CREATOR',
      'Only the creator can invite participants',
    );
    if (ownershipError) return fail(ownershipError);

    if (event.status !== GROUP_EVENT_STATUS.SCHEDULED) {
      return fail(new AppError('EVENT_NOT_SCHEDULED', ERROR_MESSAGES.EVENT_NOT_SCHEDULED, 400));
    }

    // Check if already a participant
    const existing = event.participants.find((p) => p.userId === invitedUserId);
    if (existing) {
      return fail(new AppError('ALREADY_PARTICIPANT', ERROR_MESSAGES.ALREADY_PARTICIPANT, 409));
    }

    // Check capacity
    const acceptedCount = event.participants.filter(
      (p) => p.status === PARTICIPANT_STATUS.ACCEPTED,
    ).length;
    if (acceptedCount >= event.maxParticipants) {
      return fail(new AppError('EVENT_FULL', ERROR_MESSAGES.EVENT_FULL, 400));
    }

    // Invited user must exist and have at least one active dog
    const invitedUser = await userRepo.findById(invitedUserId);
    if (!invitedUser) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const dogs = await dogRepo.findByOwner(invitedUserId, true);
    const firstDog = dogs[0];
    if (!firstDog) {
      return fail(new AppError('NO_ACTIVE_DOG', ERROR_MESSAGES.NO_ACTIVE_DOG, 400));
    }

    // Add as accepted participant with their first active dog
    await groupEventRepo.addParticipant({
      eventId,
      userId: invitedUserId,
      dogId: firstDog.id,
      status: PARTICIPANT_STATUS.ACCEPTED,
    });

    // Notify the invited user
    await notificationService.send({
      userId: invitedUserId,
      title: NOTIF_EVENT_INVITE.title,
      body: NOTIF_EVENT_INVITE.body(event.title),
      data: { type: 'event_invite', eventId },
    });

    return succeed({ message: 'Invito inviato' });
  };
}
