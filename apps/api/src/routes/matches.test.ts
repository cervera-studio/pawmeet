import { SWIPE_DAILY_LIMIT } from '@dogwalk/config';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import type { Mock } from 'vitest';
import { matchRoutes } from './matches.js';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../lib/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '../lib/db.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode('dev-secret');
const TEST_USER_ID = 'user-uuid-123';
const OTHER_USER_ID = 'other-user-456';

async function signAccessToken(userId = TEST_USER_ID) {
  return new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function buildDog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dog-uuid-1',
    ownerId: TEST_USER_ID,
    name: 'Fido',
    size: 'grande',
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    walkPrefTime: ['mattina', 'sera'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    ...overrides,
  };
}

function buildMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-uuid-1',
    dogAId: 'dog-uuid-1',
    dogBId: 'dog-uuid-2',
    compatibilityScore: 0.85,
    isActive: true,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function createApp() {
  const app = new Hono();
  app.route('/matches', matchRoutes);
  return app;
}

async function authGet(app: Hono, path: string, userId = TEST_USER_ID) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function authPost(
  app: Hono,
  path: string,
  body: Record<string, unknown>,
  userId = TEST_USER_ID,
) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function authDelete(app: Hono, path: string, userId = TEST_USER_ID) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Chainable mock helpers ─────────────────────────────────────────────────────

function buildSelectResult(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn().mockReturnValue({ limit });
  orderBy.mockResolvedValue(rows);
  const whereResult = Object.assign(Promise.resolve(rows), { orderBy, limit });
  const where = vi.fn().mockReturnValue(whereResult);
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ where, orderBy, innerJoin });
  return { from, where, orderBy, innerJoin };
}

/** Counter-based sequential select mock -- most reliable approach */
function mockSelectSequence(...rowSets: unknown[][]) {
  let callCount = 0;
  (db.select as Mock).mockImplementation(() => {
    const rows = rowSets[callCount] ?? [];
    callCount++;
    return buildSelectResult(rows);
  });
}

/** Single select result for all calls */
function mockSelectChain(rows: unknown[]) {
  (db.select as Mock).mockImplementation(() => buildSelectResult(rows));
}

function mockInsertChain(rows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as Mock).mockReturnValue({ values });
  return { values, returning };
}

/** Counter-based sequential insert mock */
function mockInsertSequence(...results: Array<{ returning?: unknown[]; resolves?: unknown }>) {
  let callCount = 0;
  (db.insert as Mock).mockImplementation(() => {
    const result = results[callCount] ?? {};
    callCount++;
    if (result.returning) {
      const returning = vi.fn().mockResolvedValue(result.returning);
      return { values: vi.fn().mockReturnValue({ returning }) };
    }
    return { values: vi.fn().mockResolvedValue(result.resolves ?? undefined) };
  });
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  (db.update as Mock).mockReturnValue({ set });
  return { set, where };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Match routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth protection ──────────────────────────────────────────────────────

  describe('auth protection', () => {
    it('returns 401 for unauthenticated GET /matches', async () => {
      const res = await app.request('/matches');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated GET /matches/discover', async () => {
      const res = await app.request('/matches/discover?dogId=dog-uuid-1');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated POST /matches/like', async () => {
      const res = await app.request('/matches/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId: 'a', targetDogId: 'b' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated POST /matches/pass', async () => {
      const res = await app.request('/matches/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId: 'a', targetDogId: 'b' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated DELETE /matches/:id', async () => {
      const res = await app.request('/matches/match-uuid-1', { method: 'DELETE' });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /matches ─────────────────────────────────────────────────────────

  describe('GET /matches', () => {
    it('returns user matches', async () => {
      mockSelectSequence(
        [{ id: 'dog-uuid-1' }], // user dogs
        [buildMatch()], // matches
      );

      const res = await authGet(app, '/matches');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.matches).toHaveLength(1);
      expect(body.matches[0].id).toBe('match-uuid-1');
    });

    it('returns empty array when user has no dogs', async () => {
      mockSelectSequence([]); // no dogs

      const res = await authGet(app, '/matches');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.matches).toHaveLength(0);
    });

    it('returns empty array when no matches exist', async () => {
      mockSelectSequence(
        [{ id: 'dog-uuid-1' }], // user dogs
        [], // no matches
      );

      const res = await authGet(app, '/matches');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.matches).toHaveLength(0);
    });
  });

  // ── GET /matches/discover ────────────────────────────────────────────────

  describe('GET /matches/discover', () => {
    it('returns 400 for missing dogId', async () => {
      const res = await authGet(app, '/matches/discover');
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid dogId (not uuid)', async () => {
      const res = await authGet(app, '/matches/discover?dogId=not-a-uuid');
      expect(res.status).toBe(400);
    });

    it('returns 404 when dog does not belong to user', async () => {
      mockSelectSequence([]); // ownership check fails

      const res = await authGet(
        app,
        '/matches/discover?dogId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      );
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Profilo cane non trovato');
    });

    it('returns 400 when user has no location', async () => {
      mockSelectSequence(
        [buildDog()], // ownership OK
        [{ latitude: null, longitude: null, searchRadiusKm: 10 }], // no location
      );

      const res = await authGet(
        app,
        '/matches/discover?dogId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      );
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Posizione non impostata');
    });

    it('returns scored suggestions when candidates exist', async () => {
      const candidateDog = buildDog({
        id: 'dog-uuid-2',
        ownerId: OTHER_USER_ID,
        name: 'Rex',
      });

      mockSelectSequence(
        [buildDog()], // ownership OK
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 50 }], // user location
        [], // no already-swiped
        [{ dog: candidateDog, ownerLat: 41.91, ownerLon: 12.5 }], // candidates
      );

      const res = await authGet(
        app,
        '/matches/discover?dogId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.suggestions).toBeDefined();
      expect(Array.isArray(body.suggestions)).toBe(true);
    });

    it('filters out already-swiped dogs', async () => {
      const candidateDog = buildDog({ id: 'already-swiped-dog', ownerId: OTHER_USER_ID });

      mockSelectSequence(
        [buildDog()], // ownership OK
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 50 }], // location
        [{ swipedDogId: 'already-swiped-dog' }], // already swiped this one
        [{ dog: candidateDog, ownerLat: 41.91, ownerLon: 12.5 }], // candidates
      );

      const res = await authGet(
        app,
        '/matches/discover?dogId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const found = body.suggestions?.find(
        (s: { dog: { id: string } }) => s.dog.id === 'already-swiped-dog',
      );
      expect(found).toBeUndefined();
    });

    it('returns empty suggestions when no candidates within radius', async () => {
      const farDog = buildDog({ id: 'far-dog', ownerId: OTHER_USER_ID });

      mockSelectSequence(
        [buildDog()], // ownership OK
        [{ latitude: 41.9028, longitude: 12.4964, searchRadiusKm: 1 }], // very small radius
        [], // no swiped
        [{ dog: farDog, ownerLat: 45.0, ownerLon: 7.0 }], // candidate is far away
      );

      const res = await authGet(
        app,
        '/matches/discover?dogId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.suggestions).toHaveLength(0);
    });
  });

  // ── POST /matches/like ───────────────────────────────────────────────────

  describe('POST /matches/like', () => {
    const validBody = {
      dogId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      targetDogId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    };

    it('records a like and returns isMatch: false when no reciprocal', async () => {
      mockSelectSequence(
        [buildDog()], // ownership check
        [], // daily swipes (0)
        [], // no existing swipe
        [], // no reciprocal like
      );
      mockInsertSequence({ resolves: undefined }); // insert swipe

      const res = await authPost(app, '/matches/like', validBody);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isMatch).toBe(false);
    });

    it('creates a match when both dogs liked each other', async () => {
      const reciprocalSwipe = {
        id: 'swipe-uuid',
        swiperDogId: validBody.targetDogId,
        swipedDogId: validBody.dogId,
        direction: 'like',
      };

      mockSelectSequence(
        [buildDog()], // ownership
        [], // daily swipes (0)
        [], // no existing swipe
        [reciprocalSwipe], // reciprocal like exists!
      );

      mockInsertSequence(
        { resolves: undefined }, // insert swipe
        { returning: [buildMatch()] }, // insert match
      );

      const res = await authPost(app, '/matches/like', validBody);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.isMatch).toBe(true);
      expect(body.match).toBeDefined();
      expect(body.match.id).toBe('match-uuid-1');
    });

    it('returns 404 when dog does not belong to user', async () => {
      mockSelectSequence([]); // ownership fails

      const res = await authPost(app, '/matches/like', validBody);
      expect(res.status).toBe(404);
    });

    it('returns 429 when daily swipe limit is reached', async () => {
      const manySwipes = Array.from({ length: SWIPE_DAILY_LIMIT }, (_, i) => ({
        id: `swipe-${i}`,
      }));
      mockSelectSequence(
        [buildDog()], // ownership OK
        manySwipes, // daily limit reached
      );

      const res = await authPost(app, '/matches/like', validBody);
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.error).toContain('Limite giornaliero');
    });

    it('returns 409 when already swiped on this dog', async () => {
      mockSelectSequence(
        [buildDog()], // ownership OK
        [], // daily swipes OK
        [{ id: 'existing-swipe', direction: 'like' }], // already swiped
      );

      const res = await authPost(app, '/matches/like', validBody);
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error).toContain('Già votato');
    });

    it('returns 400 for missing dogId', async () => {
      const res = await authPost(app, '/matches/like', {
        targetDogId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing targetDogId', async () => {
      const res = await authPost(app, '/matches/like', {
        dogId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid UUID format', async () => {
      const res = await authPost(app, '/matches/like', {
        dogId: 'not-uuid',
        targetDogId: 'also-not-uuid',
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /matches/pass ───────────────────────────────────────────────────

  describe('POST /matches/pass', () => {
    const validBody = {
      dogId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      targetDogId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    };

    it('records a pass successfully', async () => {
      mockSelectSequence(
        [buildDog()], // ownership OK
        [], // daily swipes OK
        [], // no existing swipe
      );
      mockInsertSequence({ resolves: undefined }); // insert swipe

      const res = await authPost(app, '/matches/pass', validBody);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.message).toBe('Passato');
    });

    it('returns 404 when dog does not belong to user', async () => {
      mockSelectSequence([]); // ownership fails

      const res = await authPost(app, '/matches/pass', validBody);
      expect(res.status).toBe(404);
    });

    it('returns 429 when daily swipe limit is reached', async () => {
      const manySwipes = Array.from({ length: SWIPE_DAILY_LIMIT }, (_, i) => ({
        id: `swipe-${i}`,
      }));
      mockSelectSequence(
        [buildDog()], // ownership OK
        manySwipes, // daily limit reached
      );

      const res = await authPost(app, '/matches/pass', validBody);
      expect(res.status).toBe(429);
    });

    it('returns 409 when already swiped', async () => {
      mockSelectSequence(
        [buildDog()], // ownership OK
        [], // daily swipes OK
        [{ id: 'existing', direction: 'pass' }], // already swiped
      );

      const res = await authPost(app, '/matches/pass', validBody);
      expect(res.status).toBe(409);
    });

    it('returns 400 for missing fields', async () => {
      const res = await authPost(app, '/matches/pass', {});
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /matches/:id ──────────────────────────────────────────────────

  describe('DELETE /matches/:id', () => {
    it('soft-deletes a match', async () => {
      mockSelectSequence(
        [buildMatch()], // find match
        [{ id: 'dog-uuid-1' }], // user owns dog in match
      );

      const updateMock = mockUpdateChain();

      const res = await authDelete(app, '/matches/match-uuid-1');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.message).toBe('Match annullato');
      expect(updateMock.set).toHaveBeenCalledWith({ isActive: false });
    });

    it('returns 404 when match does not exist', async () => {
      mockSelectSequence([]); // no match found

      const res = await authDelete(app, '/matches/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 404 when match is already inactive', async () => {
      mockSelectSequence([buildMatch({ isActive: false })]); // inactive match

      const res = await authDelete(app, '/matches/match-uuid-1');
      expect(res.status).toBe(404);
    });

    it('returns 404 when user does not own any dog in the match', async () => {
      mockSelectSequence(
        [buildMatch({ dogAId: 'other-dog-1', dogBId: 'other-dog-2' })], // match found
        [], // user has no dogs matching
      );

      const res = await authDelete(app, '/matches/match-uuid-1');
      expect(res.status).toBe(404);
    });
  });
});
