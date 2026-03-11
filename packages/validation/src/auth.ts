import { MIN_USER_AGE } from '@dogwalk/config';
import { calculateAge } from '@dogwalk/utils';
import { z } from 'zod';

export const AUTH_PROVIDER = {
  Email: 'email',
  Google: 'google',
  Apple: 'apple',
} as const;

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER];

/** Reusable strong-password validator (min 8 chars, 1 uppercase, 1 digit) */
export const passwordSchema = z
  .string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una maiuscola')
  .regex(/[0-9]/, 'Almeno un numero');

export const dateOfBirthSchema = z.coerce
  .date({ error: 'Data di nascita obbligatoria' })
  .refine((d) => d <= new Date(), { message: 'La data di nascita non può essere nel futuro' })
  .refine((d) => calculateAge(d) >= MIN_USER_AGE, {
    message: `Devi avere almeno ${MIN_USER_AGE} anni per usare DogWalk`,
  });

export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: passwordSchema,
  displayName: z.string().min(2).max(50),
  dateOfBirth: dateOfBirthSchema,
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

export const socialLoginSchema = z
  .object({
    provider: z.enum(['apple', 'google']),
    idToken: z.string().min(1),
    nonce: z.string().min(1).optional(),
    displayName: z.string().min(2).max(50).optional(),
  })
  .refine((data) => data.provider !== 'google' || data.nonce, {
    message: 'Nonce obbligatorio per Google login',
    path: ['nonce'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(8)
    .regex(/^\d{8}$/, 'Codice a 8 cifre'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordOtpSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(8)
    .regex(/^\d{8}$/, 'Codice a 8 cifre'),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordOtpInput = z.infer<typeof resetPasswordOtpSchema>;
