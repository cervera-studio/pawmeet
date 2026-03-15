import { z } from 'zod';

export const generalSettingsSchema = z.object({
  appName: z.string().min(1, 'Il nome app è obbligatorio'),
  supportEmail: z.string().email('Inserisci un indirizzo email valido'),
});

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export const moderationSettingsSchema = z.object({
  photoConfidenceThreshold: z.coerce.number().min(0, 'Minimo 0').max(100, 'Massimo 100'),
  maxReportsBeforeSuspension: z.coerce
    .number()
    .int('Deve essere un numero intero')
    .min(1, 'Minimo 1'),
});

export type ModerationSettingsFormValues = z.infer<typeof moderationSettingsSchema>;

export const matchingSettingsSchema = z.object({
  matchWeightSize: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
  matchWeightEnergy: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
  matchWeightBehavior: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
  matchWeightWalk: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
  matchWeightDistance: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
  matchWeightLeash: z.coerce.number().min(0, 'Minimo 0').max(1, 'Massimo 1'),
});

export type MatchingSettingsFormValues = z.infer<typeof matchingSettingsSchema>;
