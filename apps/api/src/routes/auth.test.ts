import { Hono } from 'hono';
import { SignJWT } from 'jose';
import type { Mock } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock the db module before importing the routes
vi.mock('../lib/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock password utils to avoid slow bcrypt in tests
vi.mock('../lib/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$12$mocked-hash'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { db } from '../lib/db.js';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt.js';
import { verifyPassword } from '../lib/password.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRoutes } from './auth.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

const REFRESH_SECRET = new TextEncoder().encode('dev-refresh-secret');
const ACCESS_SECRET = new TextEncoder().encode('dev-secret');

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-123',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    authProvider: 'email',
    passwordHash: '$2b$12$existing-hash',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildRefreshTokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rt-uuid-1',
    userId: 'user-uuid-123',
    tokenHash: 'some-hash',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/** Create the Hono app wired with auth routes */
function createApp() {
  const app = new Hono();
  app.route('/auth', authRoutes);
  return app;
}

/** Create a Hono app with a protected route behind authMiddleware */
function createProtectedApp() {
  const app = new Hono();
  app.route('/auth', authRoutes);
  app.use('/me/*', authMiddleware);
  app.get('/me/profile', (c) => c.json({ userId: c.get('userId') }));
  return app;
}

/** JSON POST helper */
function post(app: Hono, path: string, body: Record<string, unknown>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Chainable mock helpers for Drizzle query builder ───────────────────────────

/** Mocks db.select().from().where() chain */
function mockSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  (db.select as Mock).mockReturnValue({ from });
  return { from, where };
}

/** Mocks db.insert().values().returning() chain */
function mockInsertChain(rows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as Mock).mockReturnValue({ values });
  return { values, returning };
}

/** Mocks db.insert().values() chain (no returning) */
function mockInsertChainNoReturn() {
  const values = vi.fn().mockResolvedValue(undefined);
  (db.insert as Mock).mockReturnValue({ values });
  return { values };
}

/** Mocks db.update().set().where() chain */
function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  (db.update as Mock).mockReturnValue({ set });
  return { set, where };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Auth routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /auth/register ──────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const validBody = {
      email: 'mario@example.com',
      password: 'Password1',
      displayName: 'Mario Rossi',
    };

    it('registers a new user and returns 201 with tokens', async () => {
      const user = buildUser();

      // First select: check for existing email → none found
      mockSelectChain([]);

      // Insert user → returning the new user
      // We need to handle two inserts: users and refreshTokens
      let insertCallCount = 0;
      (db.insert as Mock).mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          // Insert user
          const returning = vi.fn().mockResolvedValue([user]);
          return { values: vi.fn().mockReturnValue({ returning }) };
        }
        // Insert refresh token
        return { values: vi.fn().mockResolvedValue(undefined) };
      });

      mockUpdateChain();

      const res = await post(app, '/auth/register', validBody);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.user.email).toBe('mario@example.com');
      expect(body.user.displayName).toBe('Mario Rossi');
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 409 when email already exists', async () => {
      mockSelectChain([{ id: 'existing-user-id' }]);

      const res = await post(app, '/auth/register', validBody);
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error).toBe('Email già registrata');
    });

    it('returns 400 for invalid email', async () => {
      const res = await post(app, '/auth/register', {
        ...validBody,
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for weak password (no uppercase)', async () => {
      const res = await post(app, '/auth/register', {
        ...validBody,
        password: 'password1',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for weak password (no digit)', async () => {
      const res = await post(app, '/auth/register', {
        ...validBody,
        password: 'Password',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const res = await post(app, '/auth/register', {
        ...validBody,
        password: 'Pw1',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for short display name', async () => {
      const res = await post(app, '/auth/register', {
        ...validBody,
        displayName: 'A',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      const res = await post(app, '/auth/register', {});
      expect(res.status).toBe(400);
    });

    it('does not include passwordHash in the response', async () => {
      const user = buildUser();
      mockSelectChain([]);

      let insertCallCount = 0;
      (db.insert as Mock).mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          const returning = vi.fn().mockResolvedValue([user]);
          return { values: vi.fn().mockReturnValue({ returning }) };
        }
        return { values: vi.fn().mockResolvedValue(undefined) };
      });
      mockUpdateChain();

      const res = await post(app, '/auth/register', validBody);
      const body = await res.json();
      expect(body.user).not.toHaveProperty('passwordHash');
    });
  });

  // ── POST /auth/login ────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const validBody = { email: 'mario@example.com', password: 'Password1' };

    it('logs in successfully and returns tokens', async () => {
      const user = buildUser();
      mockSelectChain([user]);
      (verifyPassword as Mock).mockResolvedValue(true);

      // Insert refresh token + update lastLoginAt
      mockInsertChainNoReturn();
      mockUpdateChain();

      const res = await post(app, '/auth/login', validBody);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user.email).toBe('mario@example.com');
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 401 for non-existent user', async () => {
      mockSelectChain([]);

      const res = await post(app, '/auth/login', validBody);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Credenziali non valide');
    });

    it('returns 401 for wrong password', async () => {
      const user = buildUser();
      mockSelectChain([user]);
      (verifyPassword as Mock).mockResolvedValue(false);

      const res = await post(app, '/auth/login', validBody);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Credenziali non valide');
    });

    it('returns 403 for inactive account', async () => {
      const user = buildUser({ isActive: false });
      mockSelectChain([user]);
      (verifyPassword as Mock).mockResolvedValue(true);

      const res = await post(app, '/auth/login', validBody);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toBe('Account disattivato');
    });

    it('returns 401 when user has no password hash (social auth)', async () => {
      const user = buildUser({ passwordHash: null });
      mockSelectChain([user]);

      const res = await post(app, '/auth/login', validBody);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Credenziali non valide');
    });

    it('returns 400 for missing email', async () => {
      const res = await post(app, '/auth/login', { password: 'Password1' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const res = await post(app, '/auth/login', { email: 'mario@example.com' });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /auth/refresh ──────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    async function makeRefreshToken(userId = 'user-uuid-123') {
      return new SignJWT({ type: 'refresh' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(REFRESH_SECRET);
    }

    it('rotates tokens successfully', async () => {
      const token = await makeRefreshToken();
      const storedRow = buildRefreshTokenRow();

      // Select stored token
      mockSelectChain([storedRow]);

      // Revoke old token (update) + insert new token
      // The route does: update (revoke), then generateTokenPair, then insert (new token)
      let updateCallCount = 0;
      (db.update as Mock).mockImplementation(() => {
        updateCallCount++;
        const where = vi.fn().mockResolvedValue(undefined);
        return { set: vi.fn().mockReturnValue({ where }) };
      });

      (db.insert as Mock).mockImplementation(() => {
        return { values: vi.fn().mockResolvedValue(undefined) };
      });

      const res = await post(app, '/auth/refresh', { refreshToken: token });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 401 for an invalid JWT', async () => {
      const res = await post(app, '/auth/refresh', { refreshToken: 'garbage-token' });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Token non valido');
    });

    it('returns 401 for a revoked token', async () => {
      const token = await makeRefreshToken();
      const storedRow = buildRefreshTokenRow({ revoked: true });
      mockSelectChain([storedRow]);

      const res = await post(app, '/auth/refresh', { refreshToken: token });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Token non valido');
    });

    it('returns 401 for an expired stored token', async () => {
      const token = await makeRefreshToken();
      const storedRow = buildRefreshTokenRow({
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      mockSelectChain([storedRow]);

      const res = await post(app, '/auth/refresh', { refreshToken: token });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Token non valido');
    });

    it('returns 401 when token hash is not found in DB', async () => {
      const token = await makeRefreshToken();
      mockSelectChain([]); // no stored token

      const res = await post(app, '/auth/refresh', { refreshToken: token });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Token non valido');
    });

    it('returns 401 for an access token used as refresh token', async () => {
      const accessToken = await new SignJWT({ type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user-uuid-123')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(ACCESS_SECRET);

      const res = await post(app, '/auth/refresh', { refreshToken: accessToken });
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing refreshToken', async () => {
      const res = await post(app, '/auth/refresh', {});
      expect(res.status).toBe(400);
    });
  });

  // ── POST /auth/logout ───────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('revokes the refresh token and returns success', async () => {
      const updateMock = mockUpdateChain();

      const res = await post(app, '/auth/logout', { refreshToken: 'some-token' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.message).toBe('Logout effettuato');
      expect(updateMock.set).toHaveBeenCalledWith({ revoked: true });
    });

    it('returns 200 even when token does not exist (idempotent)', async () => {
      mockUpdateChain();

      const res = await post(app, '/auth/logout', { refreshToken: 'non-existent-token' });
      expect(res.status).toBe(200);
    });

    it('returns 400 for missing refreshToken', async () => {
      const res = await post(app, '/auth/logout', {});
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty refreshToken', async () => {
      const res = await post(app, '/auth/logout', { refreshToken: '' });
      expect(res.status).toBe(400);
    });
  });
});

// ── Integration-style tests ──────────────────────────────────────────────────

describe('Auth integration flow', () => {
  const app = createProtectedApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full flow: register → access protected route → logout', async () => {
    const user = buildUser();

    // 1. Register
    mockSelectChain([]);
    let insertCallCount = 0;
    (db.insert as Mock).mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        const returning = vi.fn().mockResolvedValue([user]);
        return { values: vi.fn().mockReturnValue({ returning }) };
      }
      return { values: vi.fn().mockResolvedValue(undefined) };
    });
    mockUpdateChain();

    const registerRes = await post(app, '/auth/register', {
      email: 'mario@example.com',
      password: 'Password1',
      displayName: 'Mario Rossi',
    });
    expect(registerRes.status).toBe(201);
    const registerBody = await registerRes.json();
    const { accessToken, refreshToken } = registerBody;

    // 2. Access protected route with the access token
    const protectedRes = await app.request('/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(protectedRes.status).toBe(200);
    const profileBody = await protectedRes.json();
    expect(profileBody.userId).toBe('user-uuid-123');

    // 3. Logout
    const logoutMock = mockUpdateChain();
    const logoutRes = await post(app, '/auth/logout', { refreshToken });
    expect(logoutRes.status).toBe(200);
    expect(logoutMock.set).toHaveBeenCalledWith({ revoked: true });
  });

  it('rejects access to protected route without token', async () => {
    const res = await app.request('/me/profile');
    expect(res.status).toBe(401);
  });

  it('rejects access to protected route with malformed token', async () => {
    const res = await app.request('/me/profile', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects access with expired token', async () => {
    const expiredToken = await new SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-uuid-123')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(ACCESS_SECRET);

    const res = await app.request('/me/profile', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });
});
