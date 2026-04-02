import { WS_EVENT } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import {
  broadcastOnlineStatus,
  handleMessage,
  handleSupportTyping,
  handleTyping,
  parseWsMessage,
} from './handlers.js';
import { addConnection, getConnections, getRooms, joinRoom } from './registry.js';

// Mock ioredis to prevent real Redis connections
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock the rate limiter — must be a real class so `new Ratelimit(...)` works
vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    static slidingWindow = vi.fn();
    limit = vi.fn().mockResolvedValue({ success: true });
  }
  return { Ratelimit: MockRatelimit };
});

// Mock container services for support typing and broadcastOnlineStatus
const mockSupportRepo = {
  getTicketOwnerUserId: vi.fn().mockResolvedValue(null),
};
const mockAdminUserRepo = {
  findById: vi.fn().mockResolvedValue(null),
};
const mockUserRepo = {
  findById: vi.fn().mockResolvedValue({ privacyPrefs: { showLastSeen: true } }),
};

vi.mock('../container/services.js', () => ({
  supportRepo: mockSupportRepo,
  adminUserRepo: mockAdminUserRepo,
  userRepo: mockUserRepo,
}));

function createMockWs(readyState = 1) {
  const sent: string[] = [];
  return {
    readyState,
    get OPEN() {
      return 1;
    },
    send: vi.fn((data: string) => sent.push(data)),
    sent,
    on: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(),
    terminate: vi.fn(),
  } satisfies Record<string, unknown> as unknown as WebSocket & { sent: string[] };
}

describe('handlers', () => {
  beforeEach(() => {
    getConnections().clear();
    getRooms().clear();
    vi.clearAllMocks();
  });

  describe('parseWsMessage', () => {
    it('parses a valid message', () => {
      const result = parseWsMessage(
        JSON.stringify({ type: 'typing_start', payload: { matchId: '123' } }),
      );
      expect(result).toEqual({ type: 'typing_start', payload: { matchId: '123' } });
    });

    it('returns null for invalid JSON', () => {
      expect(parseWsMessage('not json')).toBeNull();
    });

    it('returns null for missing type field', () => {
      expect(parseWsMessage(JSON.stringify({ payload: {} }))).toBeNull();
    });

    it('returns null for missing payload field', () => {
      expect(parseWsMessage(JSON.stringify({ type: 'typing_start' }))).toBeNull();
    });

    it('returns null for non-object payload', () => {
      expect(
        parseWsMessage(JSON.stringify({ type: 'typing_start', payload: 'string' })),
      ).toBeNull();
    });
  });

  describe('handleTyping', () => {
    it('relays typing start to room peers, excluding sender', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      handleTyping('user-a', 'match-1', WS_EVENT.TYPING_START);

      expect(wsA.send).not.toHaveBeenCalled();
      expect(wsB.send).toHaveBeenCalledOnce();
      const parsed = JSON.parse(wsB.sent[0]);
      expect(parsed.type).toBe('typing_start');
      expect(parsed.payload.userId).toBe('user-a');
      expect(parsed.payload.matchId).toBe('match-1');
    });

    it('relays typing stop to room peers', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      handleTyping('user-a', 'match-1', WS_EVENT.TYPING_STOP);

      expect(wsB.send).toHaveBeenCalledOnce();
      const parsed = JSON.parse(wsB.sent[0]);
      expect(parsed.type).toBe('typing_stop');
    });

    it('does nothing if user is not in the room', () => {
      const wsB = createMockWs();
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-b');

      handleTyping('user-a', 'match-1', WS_EVENT.TYPING_START);

      expect(wsB.send).not.toHaveBeenCalled();
    });

    it('does nothing for non-existent room', () => {
      handleTyping('user-a', 'nonexistent', WS_EVENT.TYPING_START);
      // should not throw
    });
  });

  describe('handleSupportTyping', () => {
    it('sends typing to ticket owner when admin types', async () => {
      const ticketId = '550e8400-e29b-41d4-a716-446655440000';
      const ownerUserId = 'owner-1';
      const adminUserId = 'admin-1';

      mockSupportRepo.getTicketOwnerUserId.mockResolvedValue(ownerUserId);
      mockAdminUserRepo.findById.mockResolvedValue({ id: adminUserId, role: 'admin' });

      const wsOwner = createMockWs();
      addConnection(ownerUserId, wsOwner);

      await handleSupportTyping(adminUserId, ticketId, WS_EVENT.SUPPORT_TYPING_START);

      expect(wsOwner.send).toHaveBeenCalledOnce();
      const parsed = JSON.parse(wsOwner.sent[0]);
      expect(parsed.type).toBe('support_typing_start');
      expect(parsed.payload.ticketId).toBe(ticketId);
    });

    it('does nothing if ticket has no owner', async () => {
      mockSupportRepo.getTicketOwnerUserId.mockResolvedValue(null);

      await handleSupportTyping(
        'admin-1',
        '550e8400-e29b-41d4-a716-446655440000',
        WS_EVENT.SUPPORT_TYPING_START,
      );
      // should not throw or send anything
    });

    it('does nothing if sender is the ticket owner (owner types)', async () => {
      const ticketId = '550e8400-e29b-41d4-a716-446655440000';
      mockSupportRepo.getTicketOwnerUserId.mockResolvedValue('owner-1');

      const ws = createMockWs();
      addConnection('owner-1', ws);

      await handleSupportTyping('owner-1', ticketId, WS_EVENT.SUPPORT_TYPING_START);

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('drops typing if sender is not owner and not admin', async () => {
      const ticketId = '550e8400-e29b-41d4-a716-446655440000';
      mockSupportRepo.getTicketOwnerUserId.mockResolvedValue('owner-1');
      mockAdminUserRepo.findById.mockResolvedValue(null);

      const wsOwner = createMockWs();
      addConnection('owner-1', wsOwner);

      await handleSupportTyping('random-user', ticketId, WS_EVENT.SUPPORT_TYPING_START);

      expect(wsOwner.send).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('sends error for invalid message format', async () => {
      const ws = createMockWs();
      await handleMessage('user-1', ws, 'not json');

      expect(ws.send).toHaveBeenCalledOnce();
      const parsed = JSON.parse(ws.sent[0]);
      expect(parsed.type).toBe('error');
      expect(parsed.payload.error).toBe('Invalid message format');
    });

    it('handles typing_start with valid matchId', async () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      const matchId = '550e8400-e29b-41d4-a716-446655440000';
      joinRoom(matchId, 'user-a');
      joinRoom(matchId, 'user-b');

      await handleMessage(
        'user-a',
        wsA,
        JSON.stringify({ type: 'typing_start', payload: { matchId } }),
      );

      // user-b should receive typing notification
      expect(wsB.send).toHaveBeenCalledOnce();
    });

    it('ignores typing with invalid matchId (not UUID)', async () => {
      const ws = createMockWs();
      addConnection('user-a', ws);
      joinRoom('not-uuid', 'user-a');

      await handleMessage(
        'user-a',
        ws,
        JSON.stringify({ type: 'typing_start', payload: { matchId: 'not-uuid' } }),
      );

      // No error sent, just silently ignored
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('handles typing_stop', async () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      const matchId = '550e8400-e29b-41d4-a716-446655440000';
      joinRoom(matchId, 'user-a');
      joinRoom(matchId, 'user-b');

      await handleMessage(
        'user-a',
        wsA,
        JSON.stringify({ type: 'typing_stop', payload: { matchId } }),
      );

      expect(wsB.send).toHaveBeenCalledOnce();
    });

    it('handles support_typing_start with valid ticketId', async () => {
      const ticketId = '550e8400-e29b-41d4-a716-446655440000';
      mockSupportRepo.getTicketOwnerUserId.mockResolvedValue('owner-1');
      mockAdminUserRepo.findById.mockResolvedValue({ id: 'admin-1', role: 'admin' });

      const wsAdmin = createMockWs();
      const wsOwner = createMockWs();
      addConnection('admin-1', wsAdmin);
      addConnection('owner-1', wsOwner);

      await handleMessage(
        'admin-1',
        wsAdmin,
        JSON.stringify({ type: 'support_typing_start', payload: { ticketId } }),
      );

      // Async fire-and-forget — need to flush microtasks
      await vi.waitFor(() => {
        expect(wsOwner.send).toHaveBeenCalledOnce();
      });
    });

    it('ignores unknown message types silently', async () => {
      const ws = createMockWs();
      await handleMessage(
        'user-1',
        ws,
        JSON.stringify({ type: 'unknown_type', payload: { foo: 'bar' } }),
      );

      // No error, no response
      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastOnlineStatus', () => {
    it('broadcasts online status to room peers', async () => {
      mockUserRepo.findById.mockResolvedValue({ privacyPrefs: { showLastSeen: true } });

      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      await broadcastOnlineStatus('user-a', true);

      expect(wsB.send).toHaveBeenCalledOnce();
      const parsed = JSON.parse(wsB.sent[0]);
      expect(parsed.type).toBe('online_status');
      expect(parsed.payload).toEqual({ userId: 'user-a', online: true });
    });

    it('does not broadcast if showLastSeen is false', async () => {
      mockUserRepo.findById.mockResolvedValue({ privacyPrefs: { showLastSeen: false } });

      const wsB = createMockWs();
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      await broadcastOnlineStatus('user-a', true);

      expect(wsB.send).not.toHaveBeenCalled();
    });

    it('broadcasts when user not found (null?.showLastSeen !== false)', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const wsB = createMockWs();
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      await broadcastOnlineStatus('user-a', true);

      // null?.privacyPrefs?.showLastSeen is undefined, not false, so broadcast proceeds
      expect(wsB.send).toHaveBeenCalledOnce();
    });

    it('broadcasts to multiple rooms', async () => {
      mockUserRepo.findById.mockResolvedValue({ privacyPrefs: { showLastSeen: true } });

      const wsB = createMockWs();
      const wsC = createMockWs();
      addConnection('user-a', createMockWs());
      addConnection('user-b', wsB);
      addConnection('user-c', wsC);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');
      joinRoom('match-2', 'user-a');
      joinRoom('match-2', 'user-c');

      await broadcastOnlineStatus('user-a', false);

      expect(wsB.send).toHaveBeenCalledOnce();
      expect(wsC.send).toHaveBeenCalledOnce();
    });
  });
});
