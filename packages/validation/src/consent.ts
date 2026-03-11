import { z } from 'zod';

export const CONSENT_TYPES = ['analytics', 'ab_testing', 'error_tracking', 'marketing'] as const;

export const updateConsentSchema = z.object({
  consents: z
    .array(
      z.object({
        type: z.enum(CONSENT_TYPES),
        granted: z.boolean(),
      }),
    )
    .min(1),
});

export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
