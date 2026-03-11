import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  socialLoginSchema,
  verifyEmailOtpSchema,
  verifyEmailSchema,
} from '@dogwalk/validation';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { authDeps as AuthDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { authRateLimitMiddleware } from '../middleware/rate-limit.js';

export function createAuthRoutes(deps: typeof AuthDeps) {
  return new Hono()
    .use('/login', authRateLimitMiddleware)
    .use('/register', authRateLimitMiddleware)
    .use('/forgot-password', authRateLimitMiddleware)
    .use('/reset-password', authRateLimitMiddleware)
    .use('/social-login', authRateLimitMiddleware)
    .use('/verify-email-otp', authRateLimitMiddleware)
    .use('/resend-verification', authRateLimitMiddleware)
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
    })
    .post('/social-login', zValidator('json', socialLoginSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.socialLogin(input);
      return handleResult(c, result);
    })
    .post('/verify-email-otp', zValidator('json', verifyEmailOtpSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.verifyEmailOtp(input);
      return handleResult(c, result);
    })
    .post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
      const { email } = c.req.valid('json');
      const result = await deps.resendVerification(email);
      return handleResult(c, result);
    });
}
