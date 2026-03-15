import { z } from 'zod';

const ROLES = ['super_admin', 'admin', 'moderator', 'viewer'] as const;

export const createAdminUserSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
  displayName: z.string().min(1, 'Il nome è obbligatorio'),
  temporaryPassword: z.string().min(1, 'La password è obbligatoria'),
  role: z.enum(ROLES),
});

export type CreateAdminUserFormValues = z.infer<typeof createAdminUserSchema>;
