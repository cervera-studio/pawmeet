import { loginSchema, registerSchema } from '@dogwalk/validation';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { authDeps as AuthDeps } from '../container.js';
import { handleResult } from '../lib/result.js';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
});

export function createAuthRoutes(deps: typeof AuthDeps) {
  return new Hono()
    .post('/register', zValidator('json', registerSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.registerUser(input);
      return handleResult(c, result, 201);
    })
    .post('/login', zValidator('json', loginSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.loginUser(input);
      return handleResult(c, result);
    })
    .post('/refresh', zValidator('json', refreshSchema), async (c) => {
      const { refreshToken } = c.req.valid('json');
      const result = await deps.refreshTokens(refreshToken);
      return handleResult(c, result);
    })
    .post('/logout', zValidator('json', logoutSchema), async (c) => {
      const { refreshToken } = c.req.valid('json');
      const result = await deps.logoutUser(refreshToken);
      return handleResult(c, result);
    })
    .post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
      const { token } = c.req.valid('json');
      const result = await deps.verifyEmail(token);
      return handleResult(c, result);
    })
    .post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
      const { email } = c.req.valid('json');
      const result = await deps.forgotPassword(email);
      return handleResult(c, result);
    })
    .post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.resetPassword(input);
      return handleResult(c, result);
    });
}
