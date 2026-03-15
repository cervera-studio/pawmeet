import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordOtpSchema,
  socialLoginSchema,
  verifyEmailOtpSchema,
} from '@pawmeet/validation';
import type { authDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { publicProcedure, rateLimitedPublicProcedure, router, unwrapResult } from '../trpc.js';

export function createAuthRouter(deps: typeof authDeps) {
  return router({
    register: rateLimitedPublicProcedure.input(registerSchema).mutation(async ({ input }) => {
      const startMs = Date.now();
      const result = unwrapResult(await deps.registerUser(input));
      trackEvent('auth_registration_completed', result.user.id, {
        method: 'email',
        durationMs: Date.now() - startMs,
      });
      return result;
    }),

    login: rateLimitedPublicProcedure.input(loginSchema).mutation(async ({ input }) => {
      const result = unwrapResult(await deps.loginUser(input));
      trackEvent('auth_login_completed', result.user.id, { method: 'email' });
      return result;
    }),

    refresh: publicProcedure
      .input(refreshSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.refreshTokens(input.refreshToken))),

    logout: publicProcedure.input(logoutSchema).mutation(async ({ input }) => {
      const result = unwrapResult(await deps.logoutUser(input.refreshToken));
      trackEvent('auth_logout', null, { reason: 'manual' });
      return result;
    }),

    forgotPassword: rateLimitedPublicProcedure
      .input(forgotPasswordSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.forgotPassword(input.email))),

    resetPassword: rateLimitedPublicProcedure
      .input(resetPasswordOtpSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.resetPassword(input))),

    socialLogin: rateLimitedPublicProcedure.input(socialLoginSchema).mutation(async ({ input }) => {
      const result = unwrapResult(await deps.socialLogin(input));
      trackEvent('auth_login_completed', result.user.id, { method: input.provider });
      return result;
    }),

    verifyEmailOtp: rateLimitedPublicProcedure
      .input(verifyEmailOtpSchema)
      .mutation(async ({ input }) => {
        const startMs = Date.now();
        const result = unwrapResult(await deps.verifyEmailOtp(input));
        trackEvent('auth_email_verified', null, {
          method: 'otp',
          delayMs: Date.now() - startMs,
        });
        return result;
      }),

    resendVerification: rateLimitedPublicProcedure
      .input(resendVerificationSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.resendVerification(input.email))),
  });
}
