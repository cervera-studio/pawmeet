import type { ZodError } from 'zod';

/** Convert a ZodError into a flat Record mapping field names to their first error message. */
export function zodToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
