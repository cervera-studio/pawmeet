import { loginSchema, registerSchema } from '@dogwalk/validation';
import { z } from 'zod';
import type { authDeps } from '../../container.js';
import { publicProcedure, router, unwrapResult } from '../trpc.js';

const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const logoutSchema = z.object({ refreshToken: z.string().min(1) });
const verifyEmailSchema = z.object({ token: z.string().min(1) });
const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
});

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
