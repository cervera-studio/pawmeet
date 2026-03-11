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

export const socialLoginSchema = z.object({
  provider: z.enum(['apple', 'google']),
  idToken: z.string().min(1),
  displayName: z.string().min(2).max(50).optional(),
});

/** @deprecated Used by current link-based flow. Will be replaced by verifyEmailOtpSchema. */
export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/** @deprecated Used by current link-based flow. Will be replaced by resetPasswordOtpSchema. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

// --- OTP-based schemas (Phase C/D) ---

export const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Codice a 6 cifre'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordOtpSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Codice a 6 cifre'),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordOtpInput = z.infer<typeof resetPasswordOtpSchema>;
