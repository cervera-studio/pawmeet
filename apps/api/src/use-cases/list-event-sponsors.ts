import type { EventSponsor, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { EventSponsorRepository } from '../ports/event-sponsor-repository.js';

type Deps = {
  eventSponsorRepo: EventSponsorRepository;
};

export function createListEventSponsors({ eventSponsorRepo }: Deps) {
  return async (
    eventId: string,
  ): Promise<
    Result<(EventSponsor & { organizationName: string; organizationLogoUrl: string | null })[]>
  > => {
    const sponsors = await eventSponsorRepo.findByEventWithOrg(eventId);
    return succeed(sponsors);
  };
}
