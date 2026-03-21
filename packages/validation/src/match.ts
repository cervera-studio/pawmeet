import { z } from 'zod';
import { discoveryFiltersSchema } from './dog';

export const swipeSchema = z.object({
  dogId: z.uuid(),
  targetDogId: z.uuid(),
});

export const discoverSchema = z.object({
  dogId: z.uuid(),
  limit: z.number().int().min(1).max(50).optional(),
  filters: discoveryFiltersSchema.optional(),
});

export type SwipeInput = z.infer<typeof swipeSchema>;
export type DiscoverInput = z.infer<typeof discoverSchema>;
