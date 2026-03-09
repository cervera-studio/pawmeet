import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  searchRadiusKm: z.number().min(1).max(50).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
