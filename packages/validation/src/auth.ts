import { z } from 'zod';

/** Reusable strong-password validator (min 8 chars, 1 uppercase, 1 digit) */
export const passwordSchema = z
  .string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una maiuscola')
  .regex(/[0-9]/, 'Almeno un numero');

export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: passwordSchema,
  displayName: z.string().min(2).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
