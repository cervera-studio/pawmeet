import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type {
  DogRepository,
  GroupEventRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
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
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    // Only the creator can invite
    if (event.createdBy !== userId) {
      return fail(new AppError('NOT_CREATOR', 'Solo il creatore può invitare partecipanti', 403));
    }

    if (event.status !== 'scheduled') {
      return fail(
        new AppError('EVENT_NOT_SCHEDULED', "L'evento non è più aperto agli inviti", 400),
      );
    }

    // Check if already a participant
    const existing = event.participants.find((p) => p.userId === invitedUserId);
    if (existing) {
      return fail(new AppError('ALREADY_PARTICIPANT', "L'utente è già un partecipante", 409));
    }

    // Check capacity
    const acceptedCount = event.participants.filter((p) => p.status === 'accepted').length;
    if (acceptedCount >= event.maxParticipants) {
      return fail(new AppError('EVENT_FULL', "L'evento ha raggiunto il numero massimo", 400));
    }

    // Invited user must exist and have at least one active dog
    const invitedUser = await userRepo.findById(invitedUserId);
    if (!invitedUser) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    const dogs = await dogRepo.findByOwner(invitedUserId, true);
    const firstDog = dogs[0];
    if (!firstDog) {
      return fail(new AppError('NO_ACTIVE_DOG', "L'utente non ha cani attivi", 400));
    }

    // Add as accepted participant with their first active dog
    await groupEventRepo.addParticipant({
      eventId,
      userId: invitedUserId,
      dogId: firstDog.id,
      status: 'accepted',
    });

    // Notify the invited user
    await notificationService.send({
      userId: invitedUserId,
      title: 'Invito a un evento',
      body: `Sei stato invitato a "${event.title}"`,
      data: { type: 'event_invite', eventId },
    });

    return succeed({ message: 'Invito inviato' });
  };
}
