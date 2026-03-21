import { z } from 'zod';

export const addEventSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
  tier: z.enum(['title', 'gold', 'silver', 'partner']),
  logoPlacement: z.enum(['header', 'footer', 'banner']).default('footer'),
});

export const removeEventSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
});

export const listEventSponsorsSchema = z.object({
  eventId: z.uuid(),
});

export type AddEventSponsorInput = z.infer<typeof addEventSponsorSchema>;
export type RemoveEventSponsorInput = z.infer<typeof removeEventSponsorSchema>;
export type ListEventSponsorsInput = z.infer<typeof listEventSponsorsSchema>;
