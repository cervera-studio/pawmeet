import { MIN_USER_AGE } from '@pawmeet/config';
import { calculateAge } from '@pawmeet/utils';
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
  .min(8, 'password_min_length')
  .regex(/[A-Z]/, 'password_uppercase_required')
  .regex(/[0-9]/, 'password_digit_required');

export const dateOfBirthSchema = z.coerce
  .date({ error: 'date_of_birth_required' })
  .refine((d) => d <= new Date(), { message: 'date_of_birth_future' })
  .refine((d) => calculateAge(d) >= MIN_USER_AGE, {
    message: 'date_of_birth_min_age',
  });

export const registerSchema = z.object({
  email: z.string().email('email_invalid'),
  password: passwordSchema,
  displayName: z.string().min(2, 'display_name_min').max(50, 'display_name_max'),
  dateOfBirth: dateOfBirthSchema,
});

export const loginSchema = z.object({
  email: z.email(),
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
    /** Apple: ID token from native Sign In. Google (legacy implicit): ID token. */
    idToken: z.string().min(1).optional(),
    /** Google PKCE: authorization code from AuthSession. */
    code: z.string().min(1).optional(),
    /** Google PKCE: PKCE code verifier for server-side token exchange. */
    codeVerifier: z.string().min(1).optional(),
    /** Redirect URI used in the auth request (needed for code exchange). */
    redirectUri: z.string().url().optional(),
    nonce: z.string().min(1).optional(),
    displayName: z.string().min(2).max(50).optional(),
  })
  .refine((data) => data.idToken || data.code, {
    message: 'social_token_or_code_required',
    path: ['idToken'],
  })
  .refine((data) => !data.code || (data.codeVerifier && data.redirectUri), {
    message: 'social_pkce_fields_required',
    path: ['codeVerifier'],
  })
  .refine((data) => data.provider !== 'apple' || data.idToken, {
    message: 'social_apple_requires_id_token',
    path: ['idToken'],
  });

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const verifyEmailOtpSchema = z.object({
  email: z.email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'otp_format'),
});

export const resendVerificationSchema = z.object({
  email: z.email(),
});

export const resetPasswordOtpSchema = z.object({
  email: z.email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'otp_format'),
  password: passwordSchema,
});

export const listSessionsSchema = z.object({
  refreshToken: z.string().min(1),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const revokeAllOtherSessionsSchema = z.object({
  refreshToken: z.string().min(1),
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
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
export type RevokeAllOtherSessionsInput = z.infer<typeof revokeAllOtherSessionsSchema>;
