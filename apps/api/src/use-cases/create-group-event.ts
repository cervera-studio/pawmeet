import { AppError, fail, type GroupEvent, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type {
  DogRepository,
  GroupEventParticipationRepository,
  GroupEventRepository,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository & GroupEventParticipationRepository;
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
  visibility: 'public' | 'friends_only' | 'invite_only';
  category?: 'walk' | 'meetup' | 'training';
  requiresApproval?: boolean;
  dogId: string;
  coverImageUrl?: string | null;
};

export function createCreateGroupEvent({ groupEventRepo, dogRepo }: Deps) {
  return async (userId: string, input: CreateGroupEventInput): Promise<Result<GroupEvent>> => {
    if (input.scheduledAt <= new Date()) {
      return fail(new AppError('EVENT_INVALID_DATE', ERROR_MESSAGES.EVENT_INVALID_DATE, 400));
    }

    if (input.maxParticipants < 2) {
      return fail(
        new AppError('EVENT_MIN_PARTICIPANTS', ERROR_MESSAGES.EVENT_MIN_PARTICIPANTS, 400),
      );
    }

    // Verify the dog belongs to the user
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog not found', 404));
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
      category: input.category ?? 'walk',
      requiresApproval: input.requiresApproval ?? false,
      coverImageUrl: input.coverImageUrl ?? null,
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
