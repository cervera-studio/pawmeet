import { z } from 'zod';
import { latitudeSchema, longitudeSchema } from './value-objects';

export const createEmergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(5).max(30),
  relationship: z.string().max(50).optional(),
});

export const deleteEmergencyContactSchema = z.object({
  contactId: z.uuid(),
});

export const walkSosSchema = z.object({
  walkId: z.uuid(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
});

export const walkCheckinSchema = z.object({
  walkId: z.uuid(),
});

export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;
export type DeleteEmergencyContactInput = z.infer<typeof deleteEmergencyContactSchema>;
export type WalkSosInput = z.infer<typeof walkSosSchema>;
export type WalkCheckinInput = z.infer<typeof walkCheckinSchema>;
