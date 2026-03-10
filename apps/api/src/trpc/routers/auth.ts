import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@dogwalk/validation';
import type { authDeps } from '../../container.js';
import { publicProcedure, router, unwrapResult } from '../trpc.js';

export function createAuthRouter(deps: typeof authDeps) {
  return router({
    register: publicProcedure
      .input(registerSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.registerUser(input))),

    login: publicProcedure
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

    forgotPassword: publicProcedure
      .input(forgotPasswordSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.forgotPassword(input.email))),

    resetPassword: publicProcedure
      .input(resetPasswordSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.resetPassword(input))),
  });
}
