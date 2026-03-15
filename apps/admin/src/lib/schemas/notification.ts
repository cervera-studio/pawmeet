import { z } from 'zod';

export const broadcastNotificationSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio').max(100, 'Massimo 100 caratteri'),
  body: z.string().min(1, 'Il corpo è obbligatorio').max(500, 'Massimo 500 caratteri'),
});

export type BroadcastNotificationFormValues = z.infer<typeof broadcastNotificationSchema>;

export const targetedNotificationSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio').max(100, 'Massimo 100 caratteri'),
  body: z.string().min(1, 'Il corpo è obbligatorio').max(500, 'Massimo 500 caratteri'),
  userIdsText: z.string().min(1, 'Inserisci almeno un ID utente'),
});

export type TargetedNotificationFormValues = z.infer<typeof targetedNotificationSchema>;
