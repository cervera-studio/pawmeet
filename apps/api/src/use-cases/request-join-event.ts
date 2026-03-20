import { AppError, fail, type GroupEventParticipant, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { createGroupEventAggregate } from '../domain/group-event.js';
import type {
  DogRepository,
  FollowRepository,
  GroupEventParticipationRepository,
  GroupEventRepository,
} from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> &
    Pick<
      GroupEventParticipationRepository,
      'findParticipant' | 'countParticipants' | 'addParticipant'
    >;
  dogRepo: DogRepository;
  followRepo: FollowRepository;
  notificationService: NotificationService;
};

type RequestJoinEventInput = {
  eventId: string;
  dogId: string;
};

export function createRequestJoinEvent({
  groupEventRepo,
  dogRepo,
  followRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    input: RequestJoinEventInput,
  ): Promise<Result<{ participant: GroupEventParticipant; participantNumber: number }>> => {
    const event = await groupEventRepo.findById(input.eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    const aggregate = createGroupEventAggregate(event);

    if (!aggregate.isJoinable()) {
      const errorCode = aggregate.isPast() ? 'EVENT_PAST' : 'EVENT_NOT_JOINABLE';
      const errorMsg = aggregate.isPast()
        ? 'Evento già passato'
        : 'Non è possibile unirsi a questo evento';
      return fail(new AppError(errorCode, errorMsg, 400));
    }

    // Friends-only visibility check
    if (aggregate.isFriendsOnly()) {
      const isFriend = await followRepo.areFriends(userId, event.createdBy);
      if (!isFriend) {
        return fail(
          new AppError(
            'EVENT_FRIENDS_ONLY',
            "Questo evento è riservato agli amici dell'organizzatore",
            403,
          ),
        );
      }
    }

    // Verify the dog belongs to the user
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog not found', 404));
    }

    // Check if already participating
    const existing = await groupEventRepo.findParticipant(input.eventId, userId);
    if (aggregate.isAlreadyActive(existing)) {
      return fail(new AppError('ALREADY_JOINED', 'Sei già iscritto a questo evento', 409));
    }

    const count = await groupEventRepo.countParticipants(input.eventId);
    if (aggregate.isFull(count)) {
      return fail(new AppError('EVENT_FULL', 'Evento al completo', 400));
    }

    // Determine status based on approval setting
    const status = aggregate.resolveJoinStatus();

    const participant = await groupEventRepo.addParticipant({
      eventId: input.eventId,
      userId,
      dogId: input.dogId,
      status,
    });

    // Notify the organizer
    const notifTitle = status === 'accepted' ? 'Nuovo partecipante' : 'Nuova richiesta';
    const notifBody =
      status === 'accepted'
        ? `Un utente si è unito al tuo evento "${event.title}"`
        : `Un utente ha richiesto di partecipare al tuo evento "${event.title}"`;

    notificationService
      .send({
        userId: event.createdBy,
        title: notifTitle,
        body: notifBody,
        data: { eventId: event.id, type: 'event_join_request' },
      })
      .catch((err) => {
        logger.error('request-join-event', 'Failed to send notification', err);
      });

    return succeed({ participant, participantNumber: count + 1 });
  };
}
