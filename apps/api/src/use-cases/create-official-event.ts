import { AppError, fail, type GroupEvent, type Result, succeed } from '@pawmeet/types';
import type {
  DogRepository,
  GroupEventParticipationRepository,
  GroupEventRepository,
  OrganizationRepository,
} from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
  groupEventRepo: Pick<GroupEventRepository, 'create'> &
    Pick<GroupEventParticipationRepository, 'addParticipant'>;
  dogRepo: DogRepository;
};

type CreateOfficialEventInput = {
  title: string;
  description?: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string;
  latitude: number;
  longitude: number;
  maxParticipants: number;
  coverImageUrl?: string | null;
  dogId: string;
  organizationId: string;
};

export function createCreateOfficialEvent({ organizationRepo, groupEventRepo, dogRepo }: Deps) {
  return async (userId: string, input: CreateOfficialEventInput): Promise<Result<GroupEvent>> => {
    if (input.scheduledAt <= new Date()) {
      return fail(new AppError('EVENT_INVALID_DATE', 'La data deve essere nel futuro', 400));
    }

    // Verify user is member of the specified organization
    const member = await organizationRepo.findMember(input.organizationId, userId);
    if (!member) {
      return fail(new AppError('ORG_NOT_MEMBER', 'Non sei membro di questa organizzazione', 403));
    }

    // Verify the organization is verified
    const org = await organizationRepo.findById(input.organizationId);
    if (!org || !org.isVerified || !org.isActive) {
      return fail(
        new AppError('ORG_NOT_VERIFIED', "L'organizzazione non è verificata o non è attiva", 403),
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
      visibility: 'public',
      category: 'meetup',
      requiresApproval: false,
      coverImageUrl: input.coverImageUrl ?? null,
      organizationId: input.organizationId,
      isOfficial: true,
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
