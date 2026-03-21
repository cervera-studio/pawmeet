import { MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import { z } from 'zod';

export const dogSizeEnum = z.enum(['toy', 'small', 'medium', 'large', 'giant']);
export const energyLevelEnum = z.enum(['low', 'medium', 'high', 'very_high']);
export const behaviorWithDogsEnum = z.enum(['very_friendly', 'friendly', 'selective', 'reactive']);
export const behaviorWithPeopleEnum = z.enum(['very_friendly', 'friendly', 'shy', 'wary']);
export const leashBehaviorEnum = z.enum(['excellent', 'good', 'in_training', 'difficult']);
export const walkTimeEnum = z.enum([
  'early_morning',
  'morning',
  'afternoon',
  'evening',
  'late_evening',
]);
export const walkTerrainEnum = z.enum(['urban', 'park', 'countryside', 'beach', 'mountain']);
export const genderEnum = z.enum(['male', 'female']);

export const createDogSchema = z.object({
  name: z.string().min(2).max(50),
  birthDate: z.coerce.date(),
  breed: z.string().min(1).max(100),
  breedSecondary: z.string().max(100).optional(),
  size: dogSizeEnum,
  weightKg: z.number().min(0.5).max(100),
  gender: genderEnum,
  isNeutered: z.boolean(),
  energyLevel: energyLevelEnum,
  behaviorWithDogs: behaviorWithDogsEnum,
  behaviorWithPeople: behaviorWithPeopleEnum,
  leashBehavior: leashBehaviorEnum,
  recallReliability: z.enum(['reliable', 'partial', 'unreliable']).optional(),
  bio: z.string().max(500).optional(),
  walkPrefTime: z.array(walkTimeEnum).min(1),
  walkPrefDurationMin: z.number().min(15).max(180),
  walkPrefDurationMax: z.number().min(15).max(180),
  walkPrefTerrain: z.array(walkTerrainEnum).min(1),
});

export const updateDogSchema = createDogSchema.partial();

export const discoveryFiltersSchema = z.object({
  size: z.array(dogSizeEnum).min(1).optional(),
  energyLevel: z.array(energyLevelEnum).min(1).optional(),
  gender: z.array(genderEnum).min(1).optional(),
  behaviorWithDogs: z.array(behaviorWithDogsEnum).min(1).optional(),
  walkPrefTime: z.array(walkTimeEnum).min(1).optional(),
  walkPrefTerrain: z.array(walkTerrainEnum).min(1).optional(),
  maxDistanceKm: z.number().min(1).max(50).optional(),
});

export type DiscoveryFiltersInput = z.infer<typeof discoveryFiltersSchema>;

export const breedsSearchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

export const photoReorderSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(MAX_PHOTOS_PER_DOG),
});

export const analyzeDogPhotoSchema = z.object({
  imageBase64: z.string().min(100).max(7_200_000), // ~5MB base64
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type AnalyzeDogPhotoInput = z.infer<typeof analyzeDogPhotoSchema>;

export const generateDogBioSchema = z.object({
  name: z.string().min(2).max(50),
  breed: z.string().min(1).max(100),
  breedSecondary: z.string().max(100).optional(),
  size: dogSizeEnum,
  gender: genderEnum,
  energyLevel: energyLevelEnum,
  behaviorWithDogs: behaviorWithDogsEnum,
  behaviorWithPeople: behaviorWithPeopleEnum,
  leashBehavior: leashBehaviorEnum,
  walkPrefTime: z.array(walkTimeEnum).min(1),
  walkPrefTerrain: z.array(walkTerrainEnum).min(1),
});

export type CreateDogInput = z.infer<typeof createDogSchema>;
export type UpdateDogInput = z.infer<typeof updateDogSchema>;
export type GenerateDogBioInput = z.infer<typeof generateDogBioSchema>;
export type BreedsSearchInput = z.infer<typeof breedsSearchSchema>;
export type PhotoReorderInput = z.infer<typeof photoReorderSchema>;
