import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { EventSponsorRepository } from '../ports/event-sponsor-repository.js';

type Deps = {
  eventSponsorRepo: EventSponsorRepository;
};

export function createRemoveEventSponsor({ eventSponsorRepo }: Deps) {
  return async (eventId: string, organizationId: string): Promise<Result<{ success: true }>> => {
    const sponsors = await eventSponsorRepo.findByEvent(eventId);
    const exists = sponsors.some((s) => s.organizationId === organizationId);
    if (!exists) {
      return fail(new AppError('SPONSOR_NOT_FOUND', 'Sponsor not found for this event', 404));
    }

    await eventSponsorRepo.remove(eventId, organizationId);
    return succeed({ success: true as const });
  };
}
