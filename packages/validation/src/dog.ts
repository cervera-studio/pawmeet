import { MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import { z } from 'zod';

export const dogSizeEnum = z.enum(['toy', 'piccola', 'media', 'grande', 'gigante']);
export const energyLevelEnum = z.enum(['bassa', 'media', 'alta', 'molto_alta']);
export const behaviorWithDogsEnum = z.enum([
  'molto_socievole',
  'socievole',
  'selettivo',
  'reattivo',
]);
export const behaviorWithPeopleEnum = z.enum([
  'molto_socievole',
  'socievole',
  'timido',
  'diffidente',
]);
export const leashBehaviorEnum = z.enum(['eccellente', 'buono', 'in_addestramento', 'difficile']);
export const walkTimeEnum = z.enum([
  'mattina_presto',
  'mattina',
  'pomeriggio',
  'sera',
  'sera_tardi',
]);
export const walkTerrainEnum = z.enum(['urbano', 'parco', 'campagna', 'spiaggia', 'montagna']);
export const genderEnum = z.enum(['maschio', 'femmina']);

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
  recallReliability: z.enum(['affidabile', 'parziale', 'non_affidabile']).optional(),
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
  photoIds: z.array(z.string().uuid()).min(1).max(MAX_PHOTOS_PER_DOG),
});

export type CreateDogInput = z.infer<typeof createDogSchema>;
export type UpdateDogInput = z.infer<typeof updateDogSchema>;
export type BreedsSearchInput = z.infer<typeof breedsSearchSchema>;
export type PhotoReorderInput = z.infer<typeof photoReorderSchema>;
