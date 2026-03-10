import { adminUsers } from '@dogwalk/db';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokenPair,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
} from '../lib/jwt.js';

const REFRESH_COOKIE_NAME = 'admin_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export function createAdminAuthRoutes(db: NeonHttpDatabase) {
  return new Hono()
    .post('/login', async (c) => {
      const body = await c.req.json<{ email: string; password: string }>();

      if (!body.email || !body.password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const [admin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, body.email.toLowerCase().trim()));

      if (!admin) {
        return c.json({ error: 'Credenziali non valide' }, 401);
      }

      if (!admin.isActive) {
        return c.json({ error: 'Account disattivato' }, 403);
      }

      const passwordValid = await compare(body.password, admin.passwordHash);
      if (!passwordValid) {
        return c.json({ error: 'Credenziali non valide' }, 401);
      }

      // Update last login
      await db
        .update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, admin.id));

      const { accessToken, refreshToken } = await generateAdminTokenPair(admin.id, admin.role);

      // Set refresh token as HttpOnly cookie
      setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
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

        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, payload.sub));

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

        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, payload.sub));

        if (!admin || !admin.isActive) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        const accessToken = await generateAdminAccessToken(admin.id, admin.role);

        // Issue a new refresh token as well (rotation)
        const newRefreshToken = await generateAdminRefreshToken(admin.id, admin.role);
        setCookie(c, REFRESH_COOKIE_NAME, newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 0,
      });

      return c.json({ success: true });
    });
}
