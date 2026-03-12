import type { EventSponsor } from '@pawmeet/types';

export interface CreateEventSponsorInput {
  eventId: string;
  organizationId: string;
  tier: 'title' | 'gold' | 'silver' | 'partner';
  logoPlacement: 'header' | 'footer' | 'banner';
}

export interface EventSponsorRepository {
  add(input: CreateEventSponsorInput): Promise<EventSponsor>;
  remove(eventId: string, organizationId: string): Promise<void>;
  findByEvent(eventId: string): Promise<EventSponsor[]>;
  findByEventWithOrg(
    eventId: string,
  ): Promise<
    (EventSponsor & { organizationName: string; organizationLogoUrl: string | null })[]
  >;
  countByEventAndTier(eventId: string, tier: string): Promise<number>;
}
