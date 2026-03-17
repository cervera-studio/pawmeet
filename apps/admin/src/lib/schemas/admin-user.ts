import type { useTranslations } from 'next-intl';
import { z } from 'zod';

type ValidationTranslationFn = ReturnType<typeof useTranslations<'validation'>>;

const ROLES = ['super_admin', 'admin', 'moderator', 'viewer'] as const;

export function createAdminUserSchema(t: ValidationTranslationFn) {
  return z.object({
    email: z.string().email(t('email')),
    displayName: z.string().min(1, t('required', { field: t('fields.name') })),
    temporaryPassword: z.string().min(1, t('required', { field: t('fields.password') })),
    role: z.enum(ROLES),
  });
}

export type CreateAdminUserFormValues = z.infer<ReturnType<typeof createAdminUserSchema>>;
