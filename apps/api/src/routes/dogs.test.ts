import { MAX_DOGS_PER_USER } from '@dogwalk/config';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import type { Mock } from 'vitest';
import { dogRoutes } from './dogs.js';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../lib/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../lib/storage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/storage.js')>();
  return {
    ...original,
    generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned-url'),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  };
});

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
    birthDate: new Date('2023-06-15'),
    breed: 'Labrador Retriever',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: 'A friendly lab',
    walkPrefTime: ['mattina', 'sera'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildCreateDogInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Fido',
    birthDate: '2023-06-15T00:00:00.000Z',
    breed: 'Labrador Retriever',
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    walkPrefTime: ['mattina', 'sera'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    ...overrides,
  };
}

function createApp() {
  const app = new Hono();
  app.route('/dogs', dogRoutes);
  return app;
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

async function authDelete(app: Hono, path: string, userId = TEST_USER_ID) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Chainable mock helpers for Drizzle ─────────────────────────────────────────

/** Build a chainable mock result that supports both await and .orderBy()/.limit() */
function buildSelectResult(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn().mockReturnValue({ limit });
  orderBy.mockResolvedValue(rows);
  // where() needs to be both thenable (for destructuring) and have .orderBy
  const whereResult = Object.assign(Promise.resolve(rows), { orderBy, limit });
  const where = vi.fn().mockReturnValue(whereResult);
  const fromResult = Object.assign({ where }, { orderBy });
  const from = vi.fn().mockReturnValue(fromResult);
  return { from, where, orderBy };
}

function mockSelectChain(rows: unknown[]) {
  const chain = buildSelectResult(rows);
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

/** Mock sequential db.select() calls with different results */
function mockSelectChainSequence(...rowSets: unknown[][]) {
  const mock = db.select as Mock;
  for (const rows of rowSets) {
    const chain = buildSelectResult(rows);
    mock.mockReturnValueOnce(chain);
  }
}

function mockInsertChain(rows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as Mock).mockReturnValue({ values });
  return { values, returning };
}

function mockUpdateChain(rows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  (db.update as Mock).mockReturnValue({ set });
  return { set, where, returning };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Dog routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth protection ──────────────────────────────────────────────────────

  describe('auth protection', () => {
    it('returns 401 for unauthenticated GET /dogs', async () => {
      const res = await app.request('/dogs');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated POST /dogs', async () => {
      const res = await app.request('/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreateDogInput()),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated GET /dogs/:id', async () => {
      const res = await app.request('/dogs/dog-uuid-1');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated PUT /dogs/:id', async () => {
      const res = await app.request('/dogs/dog-uuid-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rex' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated DELETE /dogs/:id', async () => {
      const res = await app.request('/dogs/dog-uuid-1', { method: 'DELETE' });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /dogs ────────────────────────────────────────────────────────────

  describe('GET /dogs', () => {
    it('returns the list of active dogs for the current user', async () => {
      const dogs = [buildDog(), buildDog({ id: 'dog-uuid-2', name: 'Rex' })];
      mockSelectChain(dogs);

      const res = await authGet(app, '/dogs');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dogs).toHaveLength(2);
      expect(body.dogs[0].name).toBe('Fido');
      expect(body.dogs[1].name).toBe('Rex');
    });

    it('returns empty array when user has no dogs', async () => {
      mockSelectChain([]);

      const res = await authGet(app, '/dogs');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dogs).toHaveLength(0);
    });
  });

  // ── POST /dogs ───────────────────────────────────────────────────────────

  describe('POST /dogs', () => {
    it('creates a dog profile and returns 201', async () => {
      const dog = buildDog();

      // First: select to check max dogs → returns empty
      mockSelectChain([]);

      // Then: insert returns the new dog
      mockInsertChain([dog]);

      const res = await authPost(app, '/dogs', buildCreateDogInput());
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.dog.name).toBe('Fido');
      expect(body.dog.ownerId).toBe(TEST_USER_ID);
    });

    it('returns 400 when user already has max dogs', async () => {
      // Return MAX_DOGS_PER_USER existing dogs
      const existingDogs = Array.from({ length: MAX_DOGS_PER_USER }, (_, i) => ({
        id: `dog-uuid-${i}`,
      }));
      mockSelectChain(existingDogs);

      const res = await authPost(app, '/dogs', buildCreateDogInput());
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain(`${MAX_DOGS_PER_USER}`);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await authPost(app, '/dogs', { name: 'Fido' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid size enum', async () => {
      const res = await authPost(app, '/dogs', buildCreateDogInput({ size: 'enorme' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid energy level', async () => {
      const res = await authPost(app, '/dogs', buildCreateDogInput({ energyLevel: 'infinita' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty walkPrefTime array', async () => {
      const res = await authPost(app, '/dogs', buildCreateDogInput({ walkPrefTime: [] }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for weight below minimum', async () => {
      const res = await authPost(app, '/dogs', buildCreateDogInput({ weightKg: 0.1 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for weight above maximum', async () => {
      const res = await authPost(app, '/dogs', buildCreateDogInput({ weightKg: 200 }));
      expect(res.status).toBe(400);
    });

    it('accepts optional fields (bio, breedSecondary, recallReliability)', async () => {
      const dog = buildDog({
        bio: 'Good boy',
        breedSecondary: 'Golden',
        recallReliability: 'parziale',
      });
      mockSelectChain([]);
      mockInsertChain([dog]);

      const input = buildCreateDogInput({
        bio: 'Good boy',
        breedSecondary: 'Golden',
        recallReliability: 'parziale',
      });
      const res = await authPost(app, '/dogs', input);
      expect(res.status).toBe(201);
    });
  });

  // ── GET /dogs/:id ────────────────────────────────────────────────────────

  describe('GET /dogs/:id', () => {
    it('returns the dog profile', async () => {
      const dog = buildDog();
      // First select: dog profile, second select: photos
      mockSelectChainSequence([dog], []);

      const res = await authGet(app, '/dogs/dog-uuid-1');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dog.id).toBe('dog-uuid-1');
      expect(body.dog.name).toBe('Fido');
      expect(body.photos).toEqual([]);
    });

    it('returns 404 when dog does not exist', async () => {
      mockSelectChain([]);

      const res = await authGet(app, '/dogs/nonexistent');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Profilo cane non trovato');
    });

    it('returns 404 when dog is soft-deleted (isActive: false)', async () => {
      const dog = buildDog({ isActive: false });
      mockSelectChain([dog]);

      const res = await authGet(app, '/dogs/dog-uuid-1');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Profilo cane non trovato');
    });

    it('allows any authenticated user to view a dog profile', async () => {
      const dog = buildDog({ ownerId: OTHER_USER_ID });
      mockSelectChainSequence([dog], []);

      const res = await authGet(app, '/dogs/dog-uuid-1');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dog.ownerId).toBe(OTHER_USER_ID);
    });
  });

  // ── PUT /dogs/:id ───────────────────────────────────────────────────────

  describe('PUT /dogs/:id', () => {
    it('updates the dog profile and returns the updated dog', async () => {
      const dog = buildDog();
      const updatedDog = buildDog({ name: 'Rex' });

      // First select: ownership check
      mockSelectChain([dog]);
      // Then update with returning
      mockUpdateChain([updatedDog]);

      const res = await authPut(app, '/dogs/dog-uuid-1', { name: 'Rex' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dog.name).toBe('Rex');
    });

    it('returns 404 when dog does not belong to user', async () => {
      mockSelectChain([]); // ownership check returns nothing

      const res = await authPut(app, '/dogs/dog-uuid-1', { name: 'Rex' });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Profilo cane non trovato');
    });

    it('returns 404 when dog does not exist', async () => {
      mockSelectChain([]);

      const res = await authPut(app, '/dogs/nonexistent', { name: 'Rex' });
      expect(res.status).toBe(404);
    });

    it('allows partial update (only name)', async () => {
      const dog = buildDog();
      const updatedDog = buildDog({ name: 'Buddy' });
      mockSelectChain([dog]);
      mockUpdateChain([updatedDog]);

      const res = await authPut(app, '/dogs/dog-uuid-1', { name: 'Buddy' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dog.name).toBe('Buddy');
    });

    it('returns 400 for invalid size value', async () => {
      const dog = buildDog();
      mockSelectChain([dog]);

      const res = await authPut(app, '/dogs/dog-uuid-1', { size: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /dogs/:id ─────────────────────────────────────────────────────

  describe('DELETE /dogs/:id', () => {
    it('soft-deletes the dog profile', async () => {
      const dog = buildDog();
      mockSelectChain([dog]);

      const updateMock = mockUpdateChain();

      const res = await authDelete(app, '/dogs/dog-uuid-1');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.message).toBe('Profilo cane eliminato');
      expect(updateMock.set).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('returns 404 when dog does not belong to user', async () => {
      mockSelectChain([]);

      const res = await authDelete(app, '/dogs/dog-uuid-1');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Profilo cane non trovato');
    });

    it('returns 404 when dog does not exist', async () => {
      mockSelectChain([]);

      const res = await authDelete(app, '/dogs/nonexistent');
      expect(res.status).toBe(404);
    });

    it('prevents deletion by non-owner', async () => {
      mockSelectChain([]); // ownership AND check returns nothing for wrong user

      const res = await authDelete(app, '/dogs/dog-uuid-1', OTHER_USER_ID);
      expect(res.status).toBe(404);
    });
  });
});
