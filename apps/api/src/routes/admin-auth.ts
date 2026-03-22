import crypto from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import { logger } from '@pawmeet/utils';
import { compare, hash } from 'bcryptjs';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import { generateOtp, hashToken, PASSWORD_RESET_OTP_EXPIRY_MS } from '../lib/email.js';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokenPair,
  generateMfaPendingToken,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
  verifyMfaPendingToken,
} from '../lib/jwt.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import { decryptSecret, encryptSecret, generateTotpSetup, verifyTotpCode } from '../lib/totp.js';
import {
  authRateLimitMiddleware,
  passwordResetRateLimitMiddleware,
} from '../middleware/rate-limit.js';
import type { AdminNotificationService } from '../ports/admin-notification-service.js';
import type { AdminUserRepository } from '../ports/admin-user-repository.js';

const adminLoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8),
});

const adminForgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
});

const adminResetPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  code: z.string().min(1),
  password: z.string().min(8),
});

const REFRESH_COOKIE_NAME = 'admin_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

/** Account lockout: 5 failed attempts -> locked for 30 minutes */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30 * 60; // 30 minutes
const FAILED_ATTEMPTS_PREFIX = 'admin:login:failed:';
const LOCKOUT_PREFIX = 'admin:login:locked:';
const RESET_OTP_PREFIX = 'admin:reset-otp:';
const RESET_OTP_TTL_SECONDS = Math.ceil(PASSWORD_RESET_OTP_EXPIRY_MS / 1000);

interface AdminAuthDeps {
  adminUserRepo: AdminUserRepository;
  adminNotificationService: AdminNotificationService;
}

/** Lazy-initialized Redis — avoids import-time crash in tests */
let _redis: InstanceType<typeof import('@upstash/redis').Redis> | null = null;
async function getRedis() {
  if (!_redis) {
    const { redis } = await import('../lib/redis.js');
    _redis = redis;
  }
  return _redis;
}

/**
 * Increment failed login attempts for the given email.
 * When MAX_FAILED_ATTEMPTS is reached, set a lockout key in Redis.
 * Returns the new attempt count.
 */
async function incrementFailedAttempts(
  redis: InstanceType<typeof import('@upstash/redis').Redis>,
  email: string,
): Promise<number> {
  const key = `${FAILED_ATTEMPTS_PREFIX}${email}`;
  const attempts = await redis.incr(key);

  // Set TTL on first attempt (auto-expires after lockout window)
  if (attempts === 1) {
    await redis.expire(key, LOCKOUT_DURATION_SECONDS);
  }

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await redis.set(`${LOCKOUT_PREFIX}${email}`, '1', { ex: LOCKOUT_DURATION_SECONDS });
  }

  return attempts;
}

export function createAdminAuthRoutes(deps: AdminAuthDeps) {
  const { adminUserRepo, adminNotificationService } = deps;

  return (
    new Hono()
      .use('/login', authRateLimitMiddleware)
      .use('/forgot-password', passwordResetRateLimitMiddleware)
      .use('/reset-password', passwordResetRateLimitMiddleware)
      .post('/login', zValidator('json', adminLoginSchema), async (c) => {
        const body = c.req.valid('json');
        const redis = await getRedis();

        // Check if account is locked
        const lockKey = `${LOCKOUT_PREFIX}${body.email}`;
        const isLocked = await redis.get(lockKey);
        if (isLocked) {
          logSecurityEvent({
            event: SECURITY_EVENT.AccountLocked,
            email: body.email,
            metadata: { source: 'admin_login' },
          });
          return c.json({ error: 'Account temporaneamente bloccato. Riprova tra 30 minuti' }, 423);
        }

        const admin = await adminUserRepo.findByEmail(body.email);

        if (!admin?.isActive) {
          await incrementFailedAttempts(redis, body.email);
          return c.json({ error: 'Credenziali non valide' }, 401);
        }

        const passwordValid = await compare(body.password, admin.passwordHash);
        if (!passwordValid) {
          const attempts = await incrementFailedAttempts(redis, body.email);
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            logSecurityEvent({
              event: SECURITY_EVENT.AccountLocked,
              email: body.email,
              metadata: { source: 'admin_login', attempts },
            });
          }
          return c.json({ error: 'Credenziali non valide' }, 401);
        }

        // Successful login — clear failed attempts
        await redis.del(`${FAILED_ATTEMPTS_PREFIX}${body.email}`);

        // If MFA is enabled, issue a short-lived MFA pending token instead of full tokens
        if (admin.totpEnabled) {
          const mfaToken = await generateMfaPendingToken(admin.id, admin.role);
          return c.json({ mfaRequired: true, mfaToken });
        }

        // Update last login
        await adminUserRepo.updateLastLogin(admin.id);

        const { accessToken, refreshToken } = await generateAdminTokenPair(admin.id, admin.role);

        // Store a hash of the refresh token in DB for revocation on logout
        const rtHash = await hashToken(refreshToken);
        await adminUserRepo.updateRefreshTokenHash(admin.id, rtHash);

        // Set refresh token as HttpOnly cookie
        // SameSite=None required for cross-origin cookie (admin on Cloudflare Pages, API on Azure)
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

          if (!admin?.isActive) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          return c.json({
            id: admin.id,
            email: admin.email,
            name: admin.displayName,
            role: admin.role,
            totpEnabled: admin.totpEnabled,
          });
        } catch {
          return c.json({ error: 'Token non valido' }, 401);
        }
      })
      .post('/refresh', async (c) => {
        // CSRF check: cross-origin cookie endpoints require X-Requested-With header
        const xrw = c.req.header('x-requested-with');
        if (xrw !== 'XMLHttpRequest') {
          return c.json({ error: 'CSRF check failed' }, 403);
        }

        // Read refresh token from HttpOnly cookie
        const refreshToken = getCookie(c, REFRESH_COOKIE_NAME) ?? null;

        if (!refreshToken) {
          return c.json({ error: 'No refresh token' }, 401);
        }

        try {
          const payload = await verifyAdminRefreshToken(refreshToken);

          const admin = await adminUserRepo.findById(payload.sub);

          if (!admin?.isActive) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          // Verify the refresh token hash matches the one stored in DB
          const rtHash = await hashToken(refreshToken);
          if (!admin.refreshTokenHash || admin.refreshTokenHash !== rtHash) {
            return c.json({ error: 'Refresh token revoked' }, 401);
          }

          const accessToken = await generateAdminAccessToken(admin.id, admin.role);

          // Issue a new refresh token as well (rotation)
          const newRefreshToken = await generateAdminRefreshToken(admin.id, admin.role);

          // Store the new refresh token hash in DB
          const newRtHash = await hashToken(newRefreshToken);
          await adminUserRepo.updateRefreshTokenHash(admin.id, newRtHash);

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
        // CSRF check: cross-origin cookie endpoints require X-Requested-With header
        const xrw = c.req.header('x-requested-with');
        if (xrw !== 'XMLHttpRequest') {
          return c.json({ error: 'CSRF check failed' }, 403);
        }

        // Invalidate the refresh token in DB if we can identify the admin
        const refreshToken = getCookie(c, REFRESH_COOKIE_NAME) ?? null;
        if (refreshToken) {
          try {
            const payload = await verifyAdminRefreshToken(refreshToken);
            await adminUserRepo.updateRefreshTokenHash(payload.sub, null);
          } catch {
            // Token may be expired/invalid — still clear cookie below
          }
        }

        // Clear the refresh token cookie
        setCookie(c, REFRESH_COOKIE_NAME, '', {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
          path: '/',
          maxAge: 0,
        });

        return c.json({ success: true });
      })
      .post('/forgot-password', zValidator('json', adminForgotPasswordSchema), async (c) => {
        const { email } = c.req.valid('json');

        // Always return success to prevent email enumeration
        const admin = await adminUserRepo.findByEmail(email);

        if (admin?.isActive) {
          const otp = generateOtp();
          const otpHash = await hashToken(otp);
          const redis = await getRedis();

          // Store OTP hash in Redis with TTL
          await redis.set(`${RESET_OTP_PREFIX}${email}`, otpHash, {
            ex: RESET_OTP_TTL_SECONDS,
          });

          // Fire-and-forget
          adminNotificationService.sendPasswordResetOtp(email, otp).catch(() => {
            /* swallow — user already sees generic message */
          });
        }

        logSecurityEvent({
          event: SECURITY_EVENT.PasswordResetRequested,
          email,
          metadata: { source: 'admin' },
        });

        return c.json({ message: "Se l'email esiste, riceverai un codice per il reset" });
      })
      .post('/reset-password', zValidator('json', adminResetPasswordSchema), async (c) => {
        const { email, code, password } = c.req.valid('json');
        const redis = await getRedis();

        const storedHash = await redis.get<string>(`${RESET_OTP_PREFIX}${email}`);
        if (!storedHash) {
          logSecurityEvent({
            event: SECURITY_EVENT.PasswordResetFailed,
            email,
            metadata: { reason: 'no_otp_found', source: 'admin' },
          });
          return c.json({ error: 'Codice non valido o scaduto' }, 400);
        }

        const codeHash = await hashToken(code);
        // Use constant-time comparison to prevent timing attacks on hash values
        const codeBuffer = Buffer.from(codeHash, 'hex');
        const storedBuffer = Buffer.from(storedHash, 'hex');
        const hashesMatch =
          codeBuffer.length === storedBuffer.length &&
          crypto.timingSafeEqual(codeBuffer, storedBuffer);
        if (!hashesMatch) {
          logSecurityEvent({
            event: SECURITY_EVENT.PasswordResetFailed,
            email,
            metadata: { reason: 'invalid_code', source: 'admin' },
          });
          return c.json({ error: 'Codice non valido o scaduto' }, 400);
        }

        const admin = await adminUserRepo.findByEmail(email);
        if (!admin?.isActive) {
          return c.json({ error: 'Codice non valido o scaduto' }, 400);
        }

        // Update password
        const passwordHash = await hash(password, 12);
        await adminUserRepo.updatePasswordHash(admin.id, passwordHash);

        // Consume OTP and clear lockout
        await redis.del(`${RESET_OTP_PREFIX}${email}`);
        await redis.del(`${FAILED_ATTEMPTS_PREFIX}${email}`);
        await redis.del(`${LOCKOUT_PREFIX}${email}`);

        logSecurityEvent({
          event: SECURITY_EVENT.PasswordResetSuccess,
          userId: admin.id,
          email,
          metadata: { source: 'admin' },
        });

        return c.json({ message: 'Password reimpostata con successo' });
      })
      // ── MFA: Verify TOTP during login ──────────────────────────────────────
      .use('/mfa/verify', authRateLimitMiddleware)
      .use('/mfa/confirm', authRateLimitMiddleware)
      .use('/mfa/disable', authRateLimitMiddleware)
      .post(
        '/mfa/verify',
        zValidator(
          'json',
          z.object({
            mfaToken: z.string().min(1),
            code: z.string().length(6),
          }),
        ),
        async (c) => {
          const { mfaToken, code } = c.req.valid('json');

          let payload: Awaited<ReturnType<typeof verifyMfaPendingToken>>;
          try {
            payload = await verifyMfaPendingToken(mfaToken);
          } catch {
            return c.json({ error: 'Token MFA non valido o scaduto' }, 401);
          }

          // findById uses safe columns (no password/totpSecret), so fetch via email
          const adminSafe = await adminUserRepo.findById(payload.sub);
          if (!(adminSafe?.isActive && adminSafe.totpEnabled)) {
            return c.json({ error: 'MFA non configurato' }, 400);
          }
          const adminFull = await adminUserRepo.findByEmail(adminSafe.email);
          if (!adminFull?.totpSecret) {
            return c.json({ error: 'MFA non configurato' }, 400);
          }

          const base32Secret = decryptSecret(adminFull.totpSecret);
          if (!verifyTotpCode(base32Secret, code)) {
            logSecurityEvent({
              event: SECURITY_EVENT.MfaFailed,
              userId: payload.sub,
              metadata: { source: 'admin_login' },
            });
            return c.json({ error: 'Codice TOTP non valido' }, 401);
          }

          // MFA verified — issue full tokens
          await adminUserRepo.updateLastLogin(adminFull.id);

          const { accessToken, refreshToken } = await generateAdminTokenPair(
            adminFull.id,
            adminFull.role,
          );
          const rtHash = await hashToken(refreshToken);
          await adminUserRepo.updateRefreshTokenHash(adminFull.id, rtHash);

          setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/',
            maxAge: REFRESH_COOKIE_MAX_AGE,
          });

          logSecurityEvent({
            event: SECURITY_EVENT.MfaVerified,
            userId: adminFull.id,
            metadata: { source: 'admin_login' },
          });

          return c.json({
            token: accessToken,
            user: {
              id: adminFull.id,
              email: adminFull.email,
              name: adminFull.displayName,
              role: adminFull.role,
            },
          });
        },
      )
      // ── MFA: Setup (generate secret + QR URI) ─────────────────────────────
      .post('/mfa/setup', async (c) => {
        const authHeader = c.req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        try {
          const token = authHeader.slice(7);
          const payload = await verifyAdminAccessToken(token);
          const admin = await adminUserRepo.findById(payload.sub);
          if (!admin?.isActive) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          if (admin.totpEnabled) {
            return c.json({ error: 'MFA è già attivo' }, 400);
          }

          const { secret, uri } = generateTotpSetup(admin.email);

          // Store encrypted secret in Redis (10 min TTL) until confirmed
          const redis = await getRedis();
          await redis.set(`admin:mfa:setup:${admin.id}`, encryptSecret(secret), { ex: 600 });

          return c.json({ uri, secret });
        } catch (error) {
          logger.error('AdminAuth', 'mfa/setup failed', error);
          return c.json({ error: 'Token non valido' }, 401);
        }
      })
      // ── MFA: Confirm setup (verify first code to enable) ──────────────────
      .post(
        '/mfa/confirm',
        zValidator('json', z.object({ code: z.string().length(6) })),
        async (c) => {
          const authHeader = c.req.header('Authorization');
          if (!authHeader?.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          try {
            const token = authHeader.slice(7);
            const payload = await verifyAdminAccessToken(token);
            const adminSafe = await adminUserRepo.findById(payload.sub);
            if (!adminSafe?.isActive) {
              return c.json({ error: 'Unauthorized' }, 401);
            }

            if (adminSafe.totpEnabled) {
              return c.json({ error: 'MFA è già attivo' }, 400);
            }

            // Read pending secret from Redis (stored by /mfa/setup)
            const redis = await getRedis();
            const pendingSecret = await redis.get<string>(`admin:mfa:setup:${adminSafe.id}`);
            if (!pendingSecret) {
              return c.json({ error: 'Avvia prima il setup MFA' }, 400);
            }

            const { code } = c.req.valid('json');
            const base32Secret = decryptSecret(pendingSecret);

            if (!verifyTotpCode(base32Secret, code)) {
              return c.json({ error: 'Codice TOTP non valido. Riprova.' }, 400);
            }

            // Confirmed — persist to DB and enable
            await adminUserRepo.updateTotpSecret(adminSafe.id, pendingSecret);
            await adminUserRepo.enableTotp(adminSafe.id);
            await redis.del(`admin:mfa:setup:${adminSafe.id}`);

            logSecurityEvent({
              event: SECURITY_EVENT.MfaEnabled,
              userId: adminSafe.id,
              metadata: { source: 'admin_settings' },
            });

            return c.json({ success: true });
          } catch (error) {
            logger.error('AdminAuth', 'mfa/confirm failed', error);
            return c.json({ error: 'Token non valido' }, 401);
          }
        },
      )
      // ── MFA: Disable ──────────────────────────────────────────────────────
      .post(
        '/mfa/disable',
        zValidator(
          'json',
          z.object({
            password: z.string().min(1),
            code: z.string().length(6),
          }),
        ),
        async (c) => {
          const authHeader = c.req.header('Authorization');
          if (!authHeader?.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          try {
            const token = authHeader.slice(7);
            const payload = await verifyAdminAccessToken(token);
            const adminSafe = await adminUserRepo.findById(payload.sub);
            if (!adminSafe?.isActive) {
              return c.json({ error: 'Unauthorized' }, 401);
            }

            const adminFull = await adminUserRepo.findByEmail(adminSafe.email);
            if (!(adminFull?.totpEnabled && adminFull.totpSecret)) {
              return c.json({ error: 'MFA non è attivo' }, 400);
            }

            const { password, code } = c.req.valid('json');

            // Verify password
            const passwordValid = await compare(password, adminFull.passwordHash);
            if (!passwordValid) {
              return c.json({ error: 'Password non valida' }, 401);
            }

            // Verify TOTP code
            const base32Secret = decryptSecret(adminFull.totpSecret);
            if (!verifyTotpCode(base32Secret, code)) {
              return c.json({ error: 'Codice TOTP non valido' }, 400);
            }

            await adminUserRepo.disableTotp(adminFull.id);

            logSecurityEvent({
              event: SECURITY_EVENT.MfaDisabled,
              userId: adminFull.id,
              metadata: { source: 'admin_settings' },
            });

            return c.json({ success: true });
          } catch (error) {
            logger.error('AdminAuth', 'mfa/disable failed', error);
            return c.json({ error: 'Token non valido' }, 401);
          }
        },
      )
  );
}
