import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@dogwalk/config';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import type { Mock } from 'vitest';
import { userRoutes } from './users.js';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../lib/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/storage.js', () => ({
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  deleteObject: vi.fn().mockResolvedValue(undefined),
  extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-uuid-123/photo.jpg'),
  generateUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://r2.example.com/upload',
    key: 'avatars/user-uuid-123/photo.jpg',
  }),
  getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-uuid-123/photo.jpg'),
}));

import { db } from '../lib/db.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode('dev-secret');
const TEST_USER_ID = 'user-uuid-123';

async function signAccessToken(userId = TEST_USER_ID) {
  return new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    authProvider: 'email',
    passwordHash: '$2b$12$hash',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 10,
    emailVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function createApp() {
  const app = new Hono();
  app.route('/users', userRoutes);
  return app;
}

async function authGet(app: Hono, path: string, userId = TEST_USER_ID) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function authPut(
  app: Hono,
  path: string,
  body: Record<string, unknown>,
  userId = TEST_USER_ID,
) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// ── Chainable mock helpers ─────────────────────────────────────────────────────

function mockSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  (db.select as Mock).mockReturnValue({ from });
  return { from, where };
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  (db.update as Mock).mockReturnValue({ set });
  return { set, where };
}

/** Mock for nearby query with orderBy, limit, offset chain */
function mockNearbySelectChain(currentUserRows: unknown[], nearbyRows: unknown[]) {
  let selectCallCount = 0;
  (db.select as Mock).mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // First select: get current user's location
      const where = vi.fn().mockResolvedValue(currentUserRows);
      const from = vi.fn().mockReturnValue({ where });
      return { from };
    }
    // Second select: nearby users with full chain
    const offset = vi.fn().mockResolvedValue(nearbyRows);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    return { from };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('User routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth protection ──────────────────────────────────────────────────────

  describe('auth protection', () => {
    it('returns 401 for unauthenticated GET /users/me', async () => {
      const res = await app.request('/users/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated PUT /users/me/location', async () => {
      const res = await app.request('/users/me/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 41.9, longitude: 12.5 }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated GET /users/nearby', async () => {
      const res = await app.request('/users/nearby');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated PUT /users/me/preferences', async () => {
      const res = await app.request('/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchRadiusKm: 15 }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /users/me ────────────────────────────────────────────────────────

  describe('GET /users/me', () => {
    it('returns the current user profile without passwordHash', async () => {
      const user = buildUser();
      mockSelectChain([user]);

      const res = await authGet(app, '/users/me');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user.email).toBe('mario@example.com');
      expect(body.user.displayName).toBe('Mario Rossi');
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.latitude).toBe(41.9028);
      expect(body.user.longitude).toBe(12.4964);
    });

    it('returns 404 when user does not exist', async () => {
      mockSelectChain([]);

      const res = await authGet(app, '/users/me');
      expect(res.status).toBe(404);
    });
  });

  // ── PUT /users/me/location ───────────────────────────────────────────────

  describe('PUT /users/me/location', () => {
    it('updates location and returns coordinates', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/location', {
        latitude: 45.4642,
        longitude: 9.19,
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.latitude).toBe(45.4642);
      expect(body.longitude).toBe(9.19);
      expect(body.updatedAt).toBeDefined();
    });

    it('stores locationUpdatedAt timestamp', async () => {
      const updateMock = mockUpdateChain();

      await authPut(app, '/users/me/location', {
        latitude: 45.4642,
        longitude: 9.19,
      });

      expect(updateMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 45.4642,
          longitude: 9.19,
          locationUpdatedAt: expect.any(Date),
        }),
      );
    });

    it('returns 400 for latitude out of range (> 90)', async () => {
      const res = await authPut(app, '/users/me/location', {
        latitude: 91,
        longitude: 12.5,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for latitude out of range (< -90)', async () => {
      const res = await authPut(app, '/users/me/location', {
        latitude: -91,
        longitude: 12.5,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for longitude out of range (> 180)', async () => {
      const res = await authPut(app, '/users/me/location', {
        latitude: 41.9,
        longitude: 181,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for longitude out of range (< -180)', async () => {
      const res = await authPut(app, '/users/me/location', {
        latitude: 41.9,
        longitude: -181,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing latitude', async () => {
      const res = await authPut(app, '/users/me/location', { longitude: 12.5 });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing longitude', async () => {
      const res = await authPut(app, '/users/me/location', { latitude: 41.9 });
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty body', async () => {
      const res = await authPut(app, '/users/me/location', {});
      expect(res.status).toBe(400);
    });

    it('accepts boundary values (poles and date line)', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/location', {
        latitude: 90,
        longitude: 180,
      });
      expect(res.status).toBe(200);
    });

    it('accepts negative boundary values', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/location', {
        latitude: -90,
        longitude: -180,
      });
      expect(res.status).toBe(200);
    });
  });

  // ── PUT /users/me/preferences ────────────────────────────────────────────

  describe('PUT /users/me/preferences', () => {
    it('updates search radius', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/preferences', { searchRadiusKm: 25 });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.searchRadiusKm).toBe(25);
    });

    it('returns 400 for radius below minimum', async () => {
      const res = await authPut(app, '/users/me/preferences', {
        searchRadiusKm: MIN_SEARCH_RADIUS_KM - 1,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for radius above maximum', async () => {
      const res = await authPut(app, '/users/me/preferences', {
        searchRadiusKm: MAX_SEARCH_RADIUS_KM + 1,
      });
      expect(res.status).toBe(400);
    });

    it('accepts minimum radius', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/preferences', {
        searchRadiusKm: MIN_SEARCH_RADIUS_KM,
      });
      expect(res.status).toBe(200);
    });

    it('accepts maximum radius', async () => {
      mockUpdateChain();

      const res = await authPut(app, '/users/me/preferences', {
        searchRadiusKm: MAX_SEARCH_RADIUS_KM,
      });
      expect(res.status).toBe(200);
    });
  });

  // ── GET /users/nearby ────────────────────────────────────────────────────

  describe('GET /users/nearby', () => {
    const nearbyUser = {
      id: 'user-nearby-1',
      displayName: 'Luigi Verdi',
      avatarUrl: null,
      distanceKm: 2.5,
    };

    it('returns nearby users with default radius', async () => {
      mockNearbySelectChain(
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 10 }],
        [nearbyUser],
      );

      const res = await authGet(app, '/users/nearby');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].displayName).toBe('Luigi Verdi');
      expect(body.radius).toBe(10);
    });

    it('returns nearby users with custom radius', async () => {
      mockNearbySelectChain(
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 10 }],
        [nearbyUser],
      );

      const res = await authGet(app, '/users/nearby?radiusKm=25');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.radius).toBe(25);
    });

    it('returns empty array when no nearby users', async () => {
      mockNearbySelectChain([{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 10 }], []);

      const res = await authGet(app, '/users/nearby');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.users).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('returns 400 when user has no location set', async () => {
      mockNearbySelectChain([{ latitude: null, longitude: null, searchRadiusKm: 10 }], []);

      const res = await authGet(app, '/users/nearby');
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Posizione non impostata');
    });

    it('returns 400 for radius below minimum', async () => {
      const res = await authGet(app, '/users/nearby?radiusKm=0');
      expect(res.status).toBe(400);
    });

    it('returns 400 for radius above maximum', async () => {
      const res = await authGet(app, '/users/nearby?radiusKm=100');
      expect(res.status).toBe(400);
    });

    it('supports pagination with limit and offset', async () => {
      mockNearbySelectChain(
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 10 }],
        [nearbyUser],
      );

      const res = await authGet(app, '/users/nearby?limit=5&offset=10');
      expect(res.status).toBe(200);
    });

    it('returns 400 for negative offset', async () => {
      const res = await authGet(app, '/users/nearby?offset=-1');
      expect(res.status).toBe(400);
    });

    it('returns 400 for limit exceeding maximum (50)', async () => {
      const res = await authGet(app, '/users/nearby?limit=51');
      expect(res.status).toBe(400);
    });

    it('returns multiple nearby users sorted by distance', async () => {
      const users = [
        { id: 'user-1', displayName: 'Close User', avatarUrl: null, distanceKm: 1.2 },
        { id: 'user-2', displayName: 'Far User', avatarUrl: null, distanceKm: 8.5 },
      ];
      mockNearbySelectChain([{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 10 }], users);

      const res = await authGet(app, '/users/nearby');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.users).toHaveLength(2);
      expect(body.total).toBe(2);
    });
  });
});
