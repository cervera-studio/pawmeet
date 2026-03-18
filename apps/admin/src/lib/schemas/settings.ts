import type { useTranslations } from 'next-intl';
import { z } from 'zod';

type ValidationTranslationFn = ReturnType<typeof useTranslations<'validation'>>;

export function createGeneralSettingsSchema(t: ValidationTranslationFn) {
  return z.object({
    appName: z.string().min(1, t('required', { field: t('fields.appName') })),
    supportEmail: z.string().email(t('email')),
  });
}

export type GeneralSettingsFormValues = z.infer<ReturnType<typeof createGeneralSettingsSchema>>;

export function createModerationSettingsSchema(t: ValidationTranslationFn) {
  return z.object({
    photoConfidenceThreshold: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(100, t('maxValue', { max: 100 })),
    maxReportsBeforeSuspension: z
      .number()
      .int(t('mustBeInteger'))
      .min(1, t('minValue', { min: 1 })),
  });
}

export type ModerationSettingsFormValues = z.infer<
  ReturnType<typeof createModerationSettingsSchema>
>;

export function createMatchingSettingsSchema(t: ValidationTranslationFn) {
  return z.object({
    matchWeightSize: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
    matchWeightEnergy: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
    matchWeightBehavior: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
    matchWeightWalk: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
    matchWeightDistance: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
    matchWeightLeash: z
      .number()
      .min(0, t('minValue', { min: 0 }))
      .max(1, t('maxValue', { max: 1 })),
  });
}

export type MatchingSettingsFormValues = z.infer<ReturnType<typeof createMatchingSettingsSchema>>;
