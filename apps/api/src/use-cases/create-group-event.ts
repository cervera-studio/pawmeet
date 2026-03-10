import { AppError, fail, type GroupEvent, type Result, succeed } from '@dogwalk/types';
import type { DogRepository, GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  dogRepo: DogRepository;
};

type CreateGroupEventInput = {
  title: string;
  description?: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string;
  latitude: number;
  longitude: number;
  maxParticipants: number;
  visibility: 'public' | 'private';
  dogId: string;
};

export function createCreateGroupEvent({ groupEventRepo, dogRepo }: Deps) {
  return async (userId: string, input: CreateGroupEventInput): Promise<Result<GroupEvent>> => {
    if (input.scheduledAt <= new Date()) {
      return fail(new AppError('EVENT_INVALID_DATE', 'La data deve essere nel futuro', 400));
    }

    if (input.maxParticipants < 3) {
      return fail(
        new AppError(
          'EVENT_MIN_PARTICIPANTS',
          'Minimo 3 partecipanti per un evento di gruppo',
          400,
        ),
      );
    }

    // Verify the dog belongs to the user
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Cane non trovato', 404));
    }

    const event = await groupEventRepo.create({
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      maxParticipants: input.maxParticipants,
      visibility: input.visibility,
    });

    // Add the creator as organizer participant
    await groupEventRepo.addParticipant({
      eventId: event.id,
      userId,
      dogId: input.dogId,
      status: 'accepted',
      isOrganizer: true,
    });

    return succeed(event);
  };
}
