import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
  displayName: z.string().min(2).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
