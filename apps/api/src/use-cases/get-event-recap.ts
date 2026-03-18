import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GroupEventRepository, UserRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants'>;
  userRepo: UserRepository;
};

export interface EventRecap {
  eventId: string;
  title: string;
  scheduledAt: Date;
  durationMin: number;
  location: string;
  category: string;
  isOfficial: boolean;
  totalParticipants: number;
  participants: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    dogId: string;
  }[];
}

export function createGetEventRecap({ groupEventRepo, userRepo }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<EventRecap>> => {
    const event = await groupEventRepo.findByIdWithParticipants(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    if (event.status !== 'completed') {
      return fail(new AppError('EVENT_NOT_COMPLETED', "L'evento non è ancora terminato", 400));
    }

    // Only participants can view the recap
    const isParticipant = event.participants.some(
      (p) => p.userId === userId && p.status === 'accepted',
    );
    const isCreator = event.createdBy === userId;
    if (!(isParticipant || isCreator)) {
      return fail(new AppError('NOT_PARTICIPANT', 'Non sei un partecipante di questo evento', 403));
    }

    const accepted = event.participants.filter((p) => p.status === 'accepted');

    // Fetch user info for participants
    const userIds = accepted.map((p) => p.userId);
    const users = userIds.length > 0 ? await userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const participants = accepted.map((p) => {
      const user = userMap.get(p.userId);
      return {
        userId: p.userId,
        displayName: user?.displayName ?? 'Utente',
        avatarUrl: user?.avatarUrl ?? null,
        dogId: p.dogId,
      };
    });

    return succeed({
      eventId: event.id,
      title: event.title,
      scheduledAt: event.scheduledAt,
      durationMin: event.durationMin,
      location: event.location,
      category: event.category,
      isOfficial: event.isOfficial,
      totalParticipants: accepted.length,
      participants,
    });
  };
}
