import type { Mock } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { chatRoutes } from './chat.js';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../lib/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../ws/chat.js', () => ({
  WS_EVENT: {
    NEW_MESSAGE: 'new_message',
    MESSAGE_READ: 'message_read',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop',
    ONLINE_STATUS: 'online_status',
    ERROR: 'error',
  },
  joinRoom: vi.fn(),
  sendToRoom: vi.fn(),
  sendToUser: vi.fn(),
}));

import { db } from '../lib/db.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode('dev-secret');
const TEST_USER_ID = 'user-uuid-123';
const OTHER_USER_ID = 'other-user-456';
const MATCH_ID = 'match-uuid-1';

async function signAccessToken(userId = TEST_USER_ID) {
  return new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function createApp() {
  const app = new Hono();
  app.route('/chat', chatRoutes);
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

async function authPatch(app: Hono, path: string, userId = TEST_USER_ID) {
  const token = await signAccessToken(userId);
  return app.request(path, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Drizzle mock helpers ───────────────────────────────────────────────────────

function buildSelectResult(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const whereResult = Object.assign(Promise.resolve(rows), { orderBy, limit });
  const where = vi.fn().mockReturnValue(whereResult);
  const fromResult = Object.assign({ where }, { orderBy });
  const from = vi.fn().mockReturnValue(fromResult);
  return { from, where, orderBy, limit };
}

function mockSelectChain(rows: unknown[]) {
  const chain = buildSelectResult(rows);
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

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

describe('Chat routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth protection ──────────────────────────────────────────────────────

  describe('auth protection', () => {
    it('returns 401 for unauthenticated GET /chat/conversations', async () => {
      const res = await app.request('/chat/conversations');
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated GET /chat/conversations/:id/messages', async () => {
      const res = await app.request(`/chat/conversations/${MATCH_ID}/messages`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated POST /chat/conversations/:id/messages', async () => {
      const res = await app.request(`/chat/conversations/${MATCH_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated PATCH /chat/conversations/:id/read', async () => {
      const res = await app.request(`/chat/conversations/${MATCH_ID}/read`, { method: 'PATCH' });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /chat/conversations ────────────────────────────────────────────

  describe('GET /chat/conversations', () => {
    it('returns empty array when user has no dogs', async () => {
      mockSelectChain([]); // userDogs query

      const res = await authGet(app, '/chat/conversations');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.conversations).toEqual([]);
    });
  });

  // ── GET /chat/conversations/:matchId/messages ─────────────────────────

  describe('GET /chat/conversations/:matchId/messages', () => {
    it('returns 404 when user is not a participant', async () => {
      // isMatchParticipant: match query returns empty
      mockSelectChain([]);

      const res = await authGet(app, `/chat/conversations/${MATCH_ID}/messages`);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Conversazione non trovata');
    });

    it('returns messages with pagination', async () => {
      const match = {
        id: MATCH_ID,
        dogAId: 'dog-a',
        dogBId: 'dog-b',
        isActive: true,
      };
      const msgs = [
        {
          id: 'msg-1',
          matchId: MATCH_ID,
          senderId: OTHER_USER_ID,
          content: 'Hi',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          matchId: MATCH_ID,
          senderId: TEST_USER_ID,
          content: 'Hello',
          createdAt: new Date(),
        },
      ];

      mockSelectChainSequence(
        // isMatchParticipant: match
        [match],
        // isMatchParticipant: dogA owner
        [{ ownerId: TEST_USER_ID }],
        // isMatchParticipant: dogB owner (not reached since dogA matches)
        [{ ownerId: OTHER_USER_ID }],
        // messages query
        msgs,
      );

      const res = await authGet(app, `/chat/conversations/${MATCH_ID}/messages?limit=20`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.messages).toHaveLength(2);
      expect(body.hasMore).toBe(false);
    });
  });

  // ── POST /chat/conversations/:matchId/messages ────────────────────────

  describe('POST /chat/conversations/:matchId/messages', () => {
    it('returns 404 when user is not a participant', async () => {
      mockSelectChain([]);

      const res = await authPost(app, `/chat/conversations/${MATCH_ID}/messages`, {
        content: 'Hello',
      });
      expect(res.status).toBe(404);
    });

    it('creates a message and returns 201', async () => {
      const match = {
        id: MATCH_ID,
        dogAId: 'dog-a',
        dogBId: 'dog-b',
        isActive: true,
      };
      const newMessage = {
        id: 'msg-new',
        matchId: MATCH_ID,
        senderId: TEST_USER_ID,
        content: 'Hello!',
        mediaUrl: null,
        status: 'sent',
        isDeleted: false,
        createdAt: new Date(),
      };

      mockSelectChainSequence([match], [{ ownerId: TEST_USER_ID }], [{ ownerId: OTHER_USER_ID }]);
      mockInsertChain([newMessage]);

      const res = await authPost(app, `/chat/conversations/${MATCH_ID}/messages`, {
        content: 'Hello!',
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.message.content).toBe('Hello!');
      expect(body.message.senderId).toBe(TEST_USER_ID);
    });

    it('returns 400 for empty content', async () => {
      const res = await authPost(app, `/chat/conversations/${MATCH_ID}/messages`, {
        content: '',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for content over 2000 chars', async () => {
      const res = await authPost(app, `/chat/conversations/${MATCH_ID}/messages`, {
        content: 'x'.repeat(2001),
      });
      expect(res.status).toBe(400);
    });
  });

  // ── PATCH /chat/conversations/:matchId/read ───────────────────────────

  describe('PATCH /chat/conversations/:matchId/read', () => {
    it('returns 404 when user is not a participant', async () => {
      mockSelectChain([]);

      const res = await authPatch(app, `/chat/conversations/${MATCH_ID}/read`);
      expect(res.status).toBe(404);
    });

    it('marks messages as read', async () => {
      const match = {
        id: MATCH_ID,
        dogAId: 'dog-a',
        dogBId: 'dog-b',
        isActive: true,
      };

      mockSelectChainSequence([match], [{ ownerId: TEST_USER_ID }], [{ ownerId: OTHER_USER_ID }]);
      mockUpdateChain();

      const res = await authPatch(app, `/chat/conversations/${MATCH_ID}/read`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.message).toBe('Messaggi segnati come letti');
    });
  });
});
