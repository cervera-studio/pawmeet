import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  type GroupEventParticipant,
  type Result,
  succeed,
} from '@dogwalk/types';
import type { DogRepository, GroupEventRepository } from '../ports/index.js';
import type { NotificationService } from '../ports/notification-service.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  dogRepo: DogRepository;
  notificationService: NotificationService;
};

type JoinGroupEventInput = {
  eventId: string;
  dogId: string;
};

export function createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService }: Deps) {
  return async (
    userId: string,
    input: JoinGroupEventInput,
  ): Promise<Result<{ participant: GroupEventParticipant; participantNumber: number }>> => {
    const event = await groupEventRepo.findById(input.eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.status !== GROUP_EVENT_STATUS.SCHEDULED) {
      return fail(
        new AppError('EVENT_NOT_JOINABLE', 'Non è possibile unirsi a questo evento', 400),
      );
    }

    if (event.scheduledAt <= new Date()) {
      return fail(new AppError('EVENT_PAST', 'Evento già passato', 400));
    }

    // Verify the dog belongs to the user
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Cane non trovato', 404));
    }

    // Check if already participating
    const existing = await groupEventRepo.findParticipant(input.eventId, userId);
    if (existing && existing.status !== 'declined') {
      return fail(new AppError('ALREADY_JOINED', 'Sei già iscritto a questo evento', 409));
    }

    // Determine status based on capacity
    const count = await groupEventRepo.countParticipants(input.eventId);
    const status = count >= event.maxParticipants ? 'waitlisted' : 'accepted';

    const participant = await groupEventRepo.addParticipant({
      eventId: input.eventId,
      userId,
      dogId: input.dogId,
      status,
    });

    // Notify the organizer
    notificationService
      .send({
        userId: event.createdBy,
        title: status === 'accepted' ? 'Nuovo partecipante' : "Nuova lista d'attesa",
        body: `Un utente si è ${status === 'accepted' ? 'unito al' : "messo in lista d'attesa per il"} tuo evento "${event.title}"`,
      })
      .catch((err) => {
        console.error('[join-group-event] Failed to send notification:', err);
      });

    // participantNumber = count + 1 (the newly added participant)
    return succeed({ participant, participantNumber: count + 1 });
  };
}
