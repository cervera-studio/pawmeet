import type { useTranslations } from 'next-intl';
import { z } from 'zod';

type ValidationTranslationFn = ReturnType<typeof useTranslations<'validation'>>;

export function createBroadcastNotificationSchema(t: ValidationTranslationFn) {
  return z.object({
    title: z
      .string()
      .min(1, t('required', { field: t('fields.title') }))
      .max(100, t('maxChars', { max: 100 })),
    body: z
      .string()
      .min(1, t('required', { field: t('fields.body') }))
      .max(500, t('maxChars', { max: 500 })),
  });
}

export type BroadcastNotificationFormValues = z.infer<
  ReturnType<typeof createBroadcastNotificationSchema>
>;

export function createTargetedNotificationSchema(t: ValidationTranslationFn) {
  return z.object({
    title: z
      .string()
      .min(1, t('required', { field: t('fields.title') }))
      .max(100, t('maxChars', { max: 100 })),
    body: z
      .string()
      .min(1, t('required', { field: t('fields.body') }))
      .max(500, t('maxChars', { max: 500 })),
    userIdsText: z.string().min(1, t('userIdsRequired')),
  });
}

export type TargetedNotificationFormValues = z.infer<
  ReturnType<typeof createTargetedNotificationSchema>
>;
