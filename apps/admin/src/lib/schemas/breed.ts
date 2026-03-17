import type { useTranslations } from 'next-intl';
import { z } from 'zod';

type ValidationTranslationFn = ReturnType<typeof useTranslations<'validation'>>;

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

export function createBreedFormSchema(t: ValidationTranslationFn) {
  const scoreField = z
    .number()
    .int(t('mustBeInteger'))
    .min(1, t('minValue', { min: 1 }))
    .max(5, t('maxValue', { max: 5 }))
    .nullable()
    .optional();

  return z.object({
    code: z
      .string()
      .min(1, t('required', { field: t('fields.code') }))
      .regex(/^[a-z0-9_]+$/, t('regexCodeFormat')),
    group: z.enum(BREED_GROUPS).optional(),
    sizeCategory: z.enum(SIZE_CATEGORIES),
    avgWeightKg: z.number().positive(t('mustBePositive')),
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
}

export type BreedFormValues = z.infer<ReturnType<typeof createBreedFormSchema>>;
