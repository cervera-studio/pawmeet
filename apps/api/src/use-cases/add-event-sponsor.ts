import type { EventSponsor, Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { EventSponsorRepository } from '../ports/event-sponsor-repository.js';
import type { GroupEventRepository } from '../ports/group-event-repository.js';
import type { OrganizationRepository } from '../ports/organization-repository.js';

// Tier limits per event (from spec doc section 6.3)
const TIER_LIMITS: Record<string, number> = {
  title: 1,
  gold: 2,
  silver: 5,
};

type Deps = {
  eventSponsorRepo: EventSponsorRepository;
  groupEventRepo: GroupEventRepository;
  organizationRepo: OrganizationRepository;
};

export function createAddEventSponsor({
  eventSponsorRepo,
  groupEventRepo,
  organizationRepo,
}: Deps) {
  return async (input: {
    eventId: string;
    organizationId: string;
    tier: 'title' | 'gold' | 'silver' | 'partner';
    logoPlacement: 'header' | 'footer' | 'banner';
  }): Promise<Result<EventSponsor>> => {
    const event = await groupEventRepo.findById(input.eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    const org = await organizationRepo.findById(input.organizationId);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organizzazione non trovata', 404));
    }

    if (!org.isVerified || !org.isActive) {
      return fail(
        new AppError('ORG_NOT_VERIFIED', "L'organizzazione deve essere verificata e attiva", 400),
      );
    }

    // Check tier limit
    const limit = TIER_LIMITS[input.tier];
    if (limit !== undefined) {
      const currentCount = await eventSponsorRepo.countByEventAndTier(input.eventId, input.tier);
      if (currentCount >= limit) {
        return fail(
          new AppError(
            'TIER_LIMIT_REACHED',
            `Limite tier ${input.tier} raggiunto (max ${limit})`,
            400,
          ),
        );
      }
    }

    const sponsor = await eventSponsorRepo.add(input);
    return succeed(sponsor);
  };
}
