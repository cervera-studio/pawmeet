import { refreshTokens, TOKEN_TYPE, users, verificationTokens } from '@dogwalk/db';
import { loginSchema, registerSchema } from '@dogwalk/validation';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import {
  EMAIL_VERIFICATION_EXPIRY_MS,
  generateToken,
  hashToken,
  PASSWORD_RESET_EXPIRY_MS,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../lib/email.js';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

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

/** Hash a refresh token for storage (simple SHA-256 via Web Crypto) */
async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Strip sensitive fields before returning user data */
function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export const authRoutes = new Hono()
  /** Register a new user account. Returns user data, access token, and refresh token. */
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password, displayName } = c.req.valid('json');

    // Check if email already exists
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return c.json({ error: 'Email già registrata' }, 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const rows = await db
      .insert(users)
      .values({
        email,
        displayName,
        passwordHash,
        authProvider: 'email',
      })
      .returning();
    const user = rows[0];
    if (!user) {
      return c.json({ error: 'Errore durante la registrazione' }, 500);
    }

    // Send verification email
    const token = generateToken();
    const tokenHash = await hashToken(token);
    await db.insert(verificationTokens).values({
      userId: user.id,
      tokenHash,
      type: TOKEN_TYPE.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS),
    });
    // Fire-and-forget: don't block registration on email delivery
    sendVerificationEmail(email, token).catch(() => {});

    // Generate auth tokens
    const { accessToken, refreshToken } = await generateTokenPair(user.id);

    // Store refresh token hash
    const refreshHash = await hashRefreshToken(refreshToken);
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return c.json(
      {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      201,
    );
  })
  /** Authenticate with email/password. Returns user data and token pair. */
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      return c.json({ error: 'Credenziali non valide' }, 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: 'Credenziali non valide' }, 401);
    }

    // Check if account is active
    if (!user.isActive) {
      return c.json({ error: 'Account disattivato' }, 403);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair(user.id);

    // Store refresh token hash
    const tokenHash = await hashRefreshToken(refreshToken);
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return c.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  })
  /** Rotate refresh token. Revokes old token and returns a new pair. */
  .post('/refresh', zValidator('json', refreshSchema), async (c) => {
    const { refreshToken } = c.req.valid('json');

    // Verify the JWT refresh token
    let payload: { sub: string };
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return c.json({ error: 'Token non valido' }, 401);
    }

    // Check the token hash exists and is not revoked
    const tokenHash = await hashRefreshToken(refreshToken);
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return c.json({ error: 'Token non valido' }, 401);
    }

    // Revoke the old refresh token (rotation)
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    // Generate new token pair
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokenPair(
      payload.sub,
    );

    // Store new refresh token hash
    const newTokenHash = await hashRefreshToken(newRefreshToken);
    await db.insert(refreshTokens).values({
      userId: payload.sub,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  })
  /** Revoke a refresh token (logout). */
  .post('/logout', zValidator('json', logoutSchema), async (c) => {
    const { refreshToken } = c.req.valid('json');

    // Revoke the refresh token
    const tokenHash = await hashRefreshToken(refreshToken);
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    return c.json({ message: 'Logout effettuato' });
  })

  // --- Email verification ---

  /** Verify user email with a one-time token. */
  .post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
    const { token } = c.req.valid('json');
    const tokenHash = await hashToken(token);

    // Find valid, unused verification token
    const [stored] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, TOKEN_TYPE.EMAIL_VERIFICATION),
          gt(verificationTokens.expiresAt, new Date()),
          isNull(verificationTokens.usedAt),
        ),
      );

    if (!stored) {
      return c.json({ error: 'Token non valido o scaduto' }, 400);
    }

    // Mark token as used
    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, stored.id));

    // Mark user email as verified
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, stored.userId));

    return c.json({ message: 'Email verificata con successo' });
  })

  // --- Password recovery ---

  /** Request a password reset email. Always returns success to prevent email enumeration. */
  .post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
    const { email } = c.req.valid('json');

    // Always return success to prevent email enumeration
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    if (user) {
      const token = generateToken();
      const tokenHash = await hashToken(token);

      await db.insert(verificationTokens).values({
        userId: user.id,
        tokenHash,
        type: TOKEN_TYPE.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      });

      // Fire-and-forget
      sendPasswordResetEmail(email, token).catch(() => {});
    }

    return c.json({ message: "Se l'email esiste, riceverai un link per il reset" });
  })

  /** Reset password with token. Revokes all refresh tokens to force re-login. */
  .post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
    const { token, password } = c.req.valid('json');
    const tokenHash = await hashToken(token);

    // Find valid, unused reset token
    const [stored] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, TOKEN_TYPE.PASSWORD_RESET),
          gt(verificationTokens.expiresAt, new Date()),
          isNull(verificationTokens.usedAt),
        ),
      );

    if (!stored) {
      return c.json({ error: 'Token non valido o scaduto' }, 400);
    }

    // Mark token as used
    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, stored.id));

    // Update user password
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, stored.userId));

    // Revoke all refresh tokens for this user (force re-login)
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, stored.userId));

    return c.json({ message: 'Password reimpostata con successo' });
  });
