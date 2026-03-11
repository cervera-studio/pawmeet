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
  verifyEmailSchema,
} from '@dogwalk/validation';
import type { authDeps } from '../../container.js';
import { publicProcedure, rateLimitedPublicProcedure, router, unwrapResult } from '../trpc.js';

export function createAuthRouter(deps: typeof authDeps) {
  return router({
    register: rateLimitedPublicProcedure
      .input(registerSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.registerUser(input))),

    login: rateLimitedPublicProcedure
      .input(loginSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.loginUser(input))),

    refresh: publicProcedure
      .input(refreshSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.refreshTokens(input.refreshToken))),

    logout: publicProcedure
      .input(logoutSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.logoutUser(input.refreshToken))),

    verifyEmail: publicProcedure
      .input(verifyEmailSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.verifyEmail(input.token))),

    forgotPassword: rateLimitedPublicProcedure
      .input(forgotPasswordSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.forgotPassword(input.email))),

    resetPassword: rateLimitedPublicProcedure
      .input(resetPasswordOtpSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.resetPassword(input))),

    socialLogin: rateLimitedPublicProcedure
      .input(socialLoginSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.socialLogin(input))),

    verifyEmailOtp: rateLimitedPublicProcedure
      .input(verifyEmailOtpSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.verifyEmailOtp(input))),

    resendVerification: rateLimitedPublicProcedure
      .input(resendVerificationSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.resendVerification(input.email))),
  });
}
