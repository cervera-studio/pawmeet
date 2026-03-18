import type { useTranslations } from 'next-intl';
import { z } from 'zod';
import { EVENT } from '@/lib/constants';

type ValidationTranslationFn = ReturnType<typeof useTranslations<'validation'>>;

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;

export function createOfficialEventFormSchema(t: ValidationTranslationFn) {
  return z.object({
    title: z
      .string()
      .min(3, t('minChars', { min: 3 }))
      .max(TITLE_MAX, t('maxChars', { max: TITLE_MAX })),
    description: z
      .string()
      .max(DESCRIPTION_MAX, t('maxChars', { max: DESCRIPTION_MAX })),
    scheduledAt: z.string().min(1, t('required', { field: t('fields.date') })),
    durationMin: z
      .number()
      .int(t('mustBeInteger'))
      .min(EVENT.DURATION_MIN, t('minValue', { min: EVENT.DURATION_MIN }))
      .max(EVENT.DURATION_MAX, t('maxValue', { max: EVENT.DURATION_MAX })),
    location: z
      .string()
      .min(1, t('required', { field: t('fields.location') }))
      .max(200, t('maxChars', { max: 200 })),
    latitude: z
      .number()
      .min(-90, t('latitudeRange', { min: -90, max: 90 }))
      .max(90, t('latitudeRange', { min: -90, max: 90 })),
    longitude: z
      .number()
      .min(-180, t('longitudeRange', { min: -180, max: 180 }))
      .max(180, t('longitudeRange', { min: -180, max: 180 })),
    maxParticipants: z
      .number()
      .int(t('mustBeInteger'))
      .min(2, t('minParticipants', { min: 2 }))
      .max(500, t('maxParticipants', { max: 500 })),
    organizationId: z.string().min(1, t('selectOrganization')),
    category: z.enum(['walk', 'meetup', 'training']),
  });
}

export type CreateOfficialEventFormValues = z.infer<
  ReturnType<typeof createOfficialEventFormSchema>
>;
