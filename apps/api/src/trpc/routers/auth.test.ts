import type { SafeUser } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { authDeps } from '../../container/index.js';
import { router } from '../trpc.js';
import { createAuthRouter } from './auth.js';

vi.mock('../../lib/redis.js', () => ({
  redis: {},
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class MockRatelimit {
    static slidingWindow() {
      return {};
    }
    async limit() {
      return { success: true };
    }
  },
}));

// ── Builders ──────────────────────────────────────────────────────────────────

function buildSafeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: 'usr_1',
    email: 'test@example.com',
    displayName: 'Test User',
    authProvider: 'email',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    emailVerified: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildAuthDeps(overrides: Partial<typeof authDeps> = {}): typeof authDeps {
  return {
    registerUser: vi.fn().mockResolvedValue(
      succeed({
        user: buildSafeUser(),
        accessToken: 'access_tok',
        refreshToken: 'refresh_tok',
      }),
    ),
    loginUser: vi.fn().mockResolvedValue(
      succeed({
        user: buildSafeUser({ emailVerified: true }),
        accessToken: 'access_tok',
        refreshToken: 'refresh_tok',
      }),
    ),
    refreshTokens: vi.fn().mockResolvedValue(
      succeed({
        accessToken: 'new_access_tok',
        refreshToken: 'new_refresh_tok',
      }),
    ),
    logoutUser: vi.fn().mockResolvedValue(succeed({ message: 'Logged out' })),
    forgotPassword: vi
      .fn()
      .mockResolvedValue(
        succeed({ message: "Se l'email esiste, riceverai un codice per il reset" }),
      ),
    resetPassword: vi.fn().mockResolvedValue(succeed({ message: 'Password reset successfully' })),
    socialLogin: vi.fn().mockResolvedValue(
      succeed({
        user: buildSafeUser(),
        accessToken: 'access_tok',
        refreshToken: 'refresh_tok',
      }),
    ),
    verifyEmailOtp: vi.fn().mockResolvedValue(succeed({ message: 'Email verified successfully' })),
    resendVerification: vi
      .fn()
      .mockResolvedValue(
        succeed({ message: "Se l'email esiste, riceverai un codice di verifica" }),
      ),
    ...overrides,
  };
}

function createCaller(deps: typeof authDeps) {
  const appRouter = router({ auth: createAuthRouter(deps) });
  // Auth procedures are all public, so userId is not required
  return appRouter.createCaller({ userId: null, clientIp: '127.0.0.1' });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth router', () => {
  describe('register', () => {
    const validInput = {
      email: 'new@example.com',
      password: 'Str0ng!Pass',
      displayName: 'New User',
      dateOfBirth: '2000-01-15',
    };

    it('returns user and tokens on valid input', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.register(validInput);

      expect(result.accessToken).toBe('access_tok');
      expect(result.refreshToken).toBe('refresh_tok');
      expect(result.user.email).toBe('test@example.com');
      expect(deps.registerUser).toHaveBeenCalledWith({
        ...validInput,
        dateOfBirth: new Date('2000-01-15'),
      });
    });

    it('throws CONFLICT when email already taken', async () => {
      const deps = buildAuthDeps({
        registerUser: vi
          .fn()
          .mockResolvedValue(
            fail(
              new AppError('AUTH_EMAIL_TAKEN', 'Registration failed. Try again or sign in.', 409),
            ),
          ),
      });
      const caller = createCaller(deps);

      await expect(caller.auth.register(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.auth.register(validInput)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('rejects invalid email with Zod validation error', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(caller.auth.register({ ...validInput, email: 'not-an-email' })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.registerUser).not.toHaveBeenCalled();
    });

    it('rejects weak password with Zod validation error', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(caller.auth.register({ ...validInput, password: 'short' })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.registerUser).not.toHaveBeenCalled();
    });

    it('rejects password without uppercase letter', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(
        caller.auth.register({ ...validInput, password: 'nouppercase1' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.registerUser).not.toHaveBeenCalled();
    });

    it('rejects password without number', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(
        caller.auth.register({ ...validInput, password: 'NoNumberHere' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.registerUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validInput = { email: 'test@example.com', password: 'Str0ng!Pass' };

    it('returns tokens on valid credentials', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.login(validInput);

      expect(result.accessToken).toBe('access_tok');
      expect(result.refreshToken).toBe('refresh_tok');
      expect(deps.loginUser).toHaveBeenCalledWith(validInput);
    });

    it('throws UNAUTHORIZED on invalid credentials', async () => {
      const deps = buildAuthDeps({
        loginUser: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401)),
          ),
      });
      const caller = createCaller(deps);

      await expect(caller.auth.login(validInput)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('throws FORBIDDEN when account is disabled', async () => {
      const deps = buildAuthDeps({
        loginUser: vi
          .fn()
          .mockResolvedValue(fail(new AppError('AUTH_ACCOUNT_DISABLED', 'Account disabled', 403))),
      });
      const caller = createCaller(deps);

      await expect(caller.auth.login(validInput)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('throws TOO_MANY_REQUESTS when account is locked', async () => {
      const deps = buildAuthDeps({
        loginUser: vi
          .fn()
          .mockResolvedValue(
            fail(
              new AppError(
                'AUTH_ACCOUNT_LOCKED',
                'Account temporarily locked. Try again later.',
                429,
              ),
            ),
          ),
      });
      const caller = createCaller(deps);

      await expect(caller.auth.login(validInput)).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('rejects invalid email format', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(caller.auth.login({ email: 'bad', password: 'x' })).rejects.toThrow(TRPCError);
      expect(deps.loginUser).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('returns new tokens on valid refresh token', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.refresh({ refreshToken: 'valid_refresh_token' });

      expect(result.accessToken).toBe('new_access_tok');
      expect(result.refreshToken).toBe('new_refresh_tok');
      expect(deps.refreshTokens).toHaveBeenCalledWith('valid_refresh_token');
    });

    it('throws UNAUTHORIZED on invalid refresh token', async () => {
      const deps = buildAuthDeps({
        refreshTokens: vi
          .fn()
          .mockResolvedValue(fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401))),
      });
      const caller = createCaller(deps);

      await expect(caller.auth.refresh({ refreshToken: 'bad_token' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects empty refresh token', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(caller.auth.refresh({ refreshToken: '' })).rejects.toThrow(TRPCError);
      expect(deps.refreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('returns success message', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.logout({ refreshToken: 'some_token' });

      expect(result.message).toBe('Logged out');
      expect(deps.logoutUser).toHaveBeenCalledWith('some_token');
    });
  });

  describe('forgotPassword', () => {
    it('returns success message (regardless of email existence)', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.forgotPassword({ email: 'any@example.com' });

      expect(result.message).toContain('email');
      expect(deps.forgotPassword).toHaveBeenCalledWith('any@example.com');
    });

    it('rejects invalid email format', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(caller.auth.forgotPassword({ email: 'not-an-email' })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('returns success on valid OTP and password', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      const result = await caller.auth.resetPassword({
        email: 'test@example.com',
        code: '123456',
        password: 'NewStr0ng!',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(deps.resetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: '123456',
        password: 'NewStr0ng!',
      });
    });

    it('throws BAD_REQUEST on invalid reset OTP', async () => {
      const deps = buildAuthDeps({
        resetPassword: vi
          .fn()
          .mockResolvedValue(fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 400))),
      });
      const caller = createCaller(deps);

      await expect(
        caller.auth.resetPassword({
          email: 'test@example.com',
          code: '000000',
          password: 'NewStr0ng!',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects weak password', async () => {
      const deps = buildAuthDeps();
      const caller = createCaller(deps);

      await expect(
        caller.auth.resetPassword({
          email: 'test@example.com',
          code: '123456',
          password: 'weak',
        }),
      ).rejects.toThrow(TRPCError);
      expect(deps.resetPassword).not.toHaveBeenCalled();
    });
  });
});
