import { z } from 'zod';

export const dogSizeEnum = z.enum(['toy', 'piccola', 'media', 'grande', 'gigante']);
export const energyLevelEnum = z.enum(['bassa', 'media', 'alta', 'molto_alta']);
export const behaviorWithDogsEnum = z.enum(['molto_socievole', 'socievole', 'selettivo', 'reattivo']);
export const behaviorWithPeopleEnum = z.enum(['molto_socievole', 'socievole', 'timido', 'diffidente']);
export const leashBehaviorEnum = z.enum(['eccellente', 'buono', 'in_addestramento', 'difficile']);
export const walkTimeEnum = z.enum(['mattina_presto', 'mattina', 'pomeriggio', 'sera', 'sera_tardi']);
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

export type CreateDogInput = z.infer<typeof createDogSchema>;
export type UpdateDogInput = z.infer<typeof updateDogSchema>;
