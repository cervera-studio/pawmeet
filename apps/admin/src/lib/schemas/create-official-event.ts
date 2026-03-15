import { z } from 'zod';

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const DURATION_MIN = 15;
const DURATION_MAX = 180;

export const createOfficialEventFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Il titolo deve avere almeno 3 caratteri')
    .max(TITLE_MAX, `Massimo ${TITLE_MAX} caratteri`),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `Massimo ${DESCRIPTION_MAX} caratteri`)
    .optional()
    .default(''),
  scheduledAt: z.string().min(1, 'La data è obbligatoria'),
  durationMin: z.coerce
    .number()
    .int('La durata deve essere un numero intero')
    .min(DURATION_MIN, `Minimo ${DURATION_MIN} minuti`)
    .max(DURATION_MAX, `Massimo ${DURATION_MAX} minuti`),
  location: z.string().min(1, 'Il luogo è obbligatorio').max(200, 'Massimo 200 caratteri'),
  latitude: z.coerce.number().min(-90, 'Latitudine minima: -90').max(90, 'Latitudine massima: 90'),
  longitude: z.coerce
    .number()
    .min(-180, 'Longitudine minima: -180')
    .max(180, 'Longitudine massima: 180'),
  maxParticipants: z.coerce
    .number()
    .int('Deve essere un numero intero')
    .min(2, 'Minimo 2 partecipanti')
    .max(500, 'Massimo 500 partecipanti'),
  organizationId: z.string().min(1, "Seleziona un'organizzazione"),
  category: z.enum(['walk', 'meetup', 'training']),
});

export type CreateOfficialEventFormValues = z.infer<typeof createOfficialEventFormSchema>;
