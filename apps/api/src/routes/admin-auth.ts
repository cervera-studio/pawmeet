import { zValidator } from '@hono/zod-validator';
import { compare } from 'bcryptjs';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokenPair,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
} from '../lib/jwt.js';
import { authRateLimitMiddleware } from '../middleware/rate-limit.js';
import type { AdminUserRepository } from '../ports/admin-user-repository.js';

const adminLoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

const REFRESH_COOKIE_NAME = 'admin_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export function createAdminAuthRoutes(adminUserRepo: AdminUserRepository) {
  return new Hono()
    .use('/login', authRateLimitMiddleware)
    .post('/login', zValidator('json', adminLoginSchema), async (c) => {
      const body = c.req.valid('json');

      const admin = await adminUserRepo.findByEmail(body.email);

      if (!admin || !admin.isActive) {
        return c.json({ error: 'Credenziali non valide' }, 401);
      }

      const passwordValid = await compare(body.password, admin.passwordHash);
      if (!passwordValid) {
        return c.json({ error: 'Credenziali non valide' }, 401);
      }

      // Update last login
      await adminUserRepo.updateLastLogin(admin.id);

      const { accessToken, refreshToken } = await generateAdminTokenPair(admin.id, admin.role);

      // Set refresh token as HttpOnly cookie
      // SameSite=None required for cross-origin cookie (admin on Vercel, API on Fly.io)
      setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: REFRESH_COOKIE_MAX_AGE,
      });

      return c.json({
        token: accessToken,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.displayName,
          role: admin.role,
        },
      });
    })
    .get('/me', async (c) => {
      const authHeader = c.req.header('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      try {
        const token = authHeader.slice(7);
        const payload = await verifyAdminAccessToken(token);

        const admin = await adminUserRepo.findById(payload.sub);

        if (!admin || !admin.isActive) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        return c.json({
          id: admin.id,
          email: admin.email,
          name: admin.displayName,
          role: admin.role,
        });
      } catch {
        return c.json({ error: 'Token non valido' }, 401);
      }
    })
    .post('/refresh', async (c) => {
      // Read refresh token from HttpOnly cookie
      const refreshToken = getCookie(c, REFRESH_COOKIE_NAME) ?? null;

      if (!refreshToken) {
        return c.json({ error: 'No refresh token' }, 401);
      }

      try {
        const payload = await verifyAdminRefreshToken(refreshToken);

        const admin = await adminUserRepo.findById(payload.sub);

        if (!admin || !admin.isActive) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        const accessToken = await generateAdminAccessToken(admin.id, admin.role);

        // Issue a new refresh token as well (rotation)
        const newRefreshToken = await generateAdminRefreshToken(admin.id, admin.role);
        setCookie(c, REFRESH_COOKIE_NAME, newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
          path: '/',
          maxAge: REFRESH_COOKIE_MAX_AGE,
        });

        return c.json({
          token: accessToken,
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.displayName,
            role: admin.role,
          },
        });
      } catch {
        return c.json({ error: 'Refresh token non valido' }, 401);
      }
    })
    .post('/logout', async (c) => {
      // Clear the refresh token cookie
      setCookie(c, REFRESH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 0,
      });

      return c.json({ success: true });
    });
}
