import type { ZodError } from 'zod';
import i18n from '@/lib/i18n';

/** Convert a ZodError into a flat Record mapping field names to their first translated error. */
export function zodToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!fieldErrors[key]) {
      const translationKey = `validation.${issue.message}`;
      fieldErrors[key] = i18n.exists(translationKey)
        ? i18n.t(translationKey)
        : issue.message;
    }
  }
  return fieldErrors;
}
