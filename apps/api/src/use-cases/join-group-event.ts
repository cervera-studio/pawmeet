import { AppError, fail, type GroupEventParticipant, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { createGroupEventAggregate } from '../domain/group-event.js';
import type {
  DogRepository,
  FollowRepository,
  GroupEventParticipationRepository,
  GroupEventRepository,
} from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById'> & GroupEventParticipationRepository;
  dogRepo: DogRepository;
  followRepo: FollowRepository;
  notificationService: NotificationService;
};

type JoinGroupEventInput = {
  eventId: string;
  dogId: string;
};

export function createJoinGroupEvent({
  groupEventRepo,
  dogRepo,
  followRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    input: JoinGroupEventInput,
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
      return fail(new AppError('ALREADY_JOINED', ERROR_MESSAGES.ALREADY_JOINED_EVENT, 409));
    }

    // Determine status based on capacity and approval setting
    const count = await groupEventRepo.countParticipants(input.eventId);
    if (aggregate.isFull(count)) {
      return fail(new AppError('EVENT_FULL', ERROR_MESSAGES.EVENT_FULL, 400));
    }

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
        data: { eventId: event.id, type: 'event_join' },
      })
      .catch((err) => {
        logger.error('join-group-event', 'Failed to send notification', err);
      });

    void emit({
      type: DOMAIN_EVENT.GROUP_EVENT_JOINED,
      payload: { eventId: input.eventId, userId, participantNumber: count + 1 },
      timestamp: new Date(),
    });

    return succeed({ participant, participantNumber: count + 1 });
  };
}
