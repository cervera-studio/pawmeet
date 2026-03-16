import { z } from 'zod';

const SIZE_CATEGORIES = ['toy', 'piccola', 'media', 'grande', 'gigante'] as const;

const BREED_GROUPS = [
  'Herding',
  'Hound',
  'Non-Sporting',
  'Sporting',
  'Terrier',
  'Toy',
  'Working',
  'Miscellaneous',
] as const;

const scoreField = z
  .number()
  .int('Deve essere un numero intero')
  .min(1, 'Minimo 1')
  .max(5, 'Massimo 5')
  .nullable()
  .optional();

export const breedFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Il codice è obbligatorio')
    .regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e underscore'),
  group: z.enum(BREED_GROUPS).optional(),
  sizeCategory: z.enum(SIZE_CATEGORIES),
  avgWeightKg: z.number().positive('Il peso deve essere positivo'),
  energy: scoreField,
  playfulness: scoreField,
  trainability: scoreField,
  barking: scoreField,
  goodWithOtherDogs: scoreField,
  goodWithChildren: scoreField,
  goodWithStrangers: scoreField,
  protectiveness: scoreField,
  shedding: scoreField,
  grooming: scoreField,
});

export type BreedFormValues = z.infer<typeof breedFormSchema>;
