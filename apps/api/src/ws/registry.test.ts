import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import {
  addConnection,
  getConnections,
  getRooms,
  isUserOnline,
  joinRoom,
  leaveRoom,
  removeConnection,
  sendToRoom,
  sendToUser,
} from './registry.js';

// Mock ioredis to prevent real Redis connections
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(1),
      on: vi.fn(),
      disconnect: vi.fn(),
    })),
  };
});

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
    ping: vi.fn(),
    terminate: vi.fn(),
    close: vi.fn(),
  } satisfies Record<string, unknown> as unknown as WebSocket & { sent: string[] };
}

describe('registry', () => {
  beforeEach(() => {
    getConnections().clear();
    getRooms().clear();
  });

  describe('addConnection / removeConnection', () => {
    it('adds a connection for a user', () => {
      const ws = createMockWs();
      addConnection('user-1', ws);

      expect(getConnections().has('user-1')).toBe(true);
      expect(getConnections().get('user-1')?.size).toBe(1);
    });

    it('supports multiple connections per user', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      addConnection('user-1', ws1);
      addConnection('user-1', ws2);

      expect(getConnections().get('user-1')?.size).toBe(2);
    });

    it('removes a connection and cleans up when last one is removed', () => {
      const ws = createMockWs();
      addConnection('user-1', ws);
      removeConnection('user-1', ws);

      expect(getConnections().has('user-1')).toBe(false);
    });

    it('keeps user entry when removing one of multiple connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      addConnection('user-1', ws1);
      addConnection('user-1', ws2);
      removeConnection('user-1', ws1);

      expect(getConnections().get('user-1')?.size).toBe(1);
    });

    it('does nothing when removing a non-existent connection', () => {
      const ws = createMockWs();
      removeConnection('user-1', ws);
      expect(getConnections().has('user-1')).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    it('returns false for unknown user', () => {
      expect(isUserOnline('unknown')).toBe(false);
    });

    it('returns true after adding a connection', () => {
      addConnection('user-1', createMockWs());
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('returns false after removing all connections', () => {
      const ws = createMockWs();
      addConnection('user-1', ws);
      removeConnection('user-1', ws);
      expect(isUserOnline('user-1')).toBe(false);
    });
  });

  describe('joinRoom / leaveRoom', () => {
    it('creates a room and adds users', () => {
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      expect(getRooms().get('match-1')?.size).toBe(2);
    });

    it('removes a user from a room', () => {
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');
      leaveRoom('match-1', 'user-a');

      expect(getRooms().get('match-1')?.size).toBe(1);
      expect(getRooms().get('match-1')?.has('user-a')).toBe(false);
    });

    it('deletes room when last user leaves', () => {
      joinRoom('match-1', 'user-a');
      leaveRoom('match-1', 'user-a');

      expect(getRooms().has('match-1')).toBe(false);
    });

    it('handles leaving a non-existent room gracefully', () => {
      leaveRoom('nonexistent', 'user-a');
      expect(getRooms().has('nonexistent')).toBe(false);
    });

    it('does not duplicate user in room on double join', () => {
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-a');
      expect(getRooms().get('match-1')?.size).toBe(1);
    });
  });

  describe('sendToUser', () => {
    it('sends message to all user connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      addConnection('user-1', ws1);
      addConnection('user-1', ws2);

      sendToUser('user-1', { type: 'new_message', payload: { message: 'hi' } });

      expect(ws1.send).toHaveBeenCalledOnce();
      expect(ws2.send).toHaveBeenCalledOnce();
    });

    it('skips closed connections', () => {
      const ws = createMockWs(3); // CLOSED
      addConnection('user-1', ws);

      sendToUser('user-1', { type: 'error', payload: { error: 'test' } });

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('does nothing for unknown user', () => {
      sendToUser('nonexistent', { type: 'error', payload: { error: 'test' } });
      // should not throw
    });
  });

  describe('sendToRoom', () => {
    it('sends message to all room participants', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      sendToRoom('match-1', {
        type: 'typing_start',
        payload: { userId: 'user-a', matchId: 'match-1' },
      });

      expect(wsA.send).toHaveBeenCalledOnce();
      expect(wsB.send).toHaveBeenCalledOnce();
    });

    it('excludes specified user', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      addConnection('user-a', wsA);
      addConnection('user-b', wsB);
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      sendToRoom(
        'match-1',
        { type: 'typing_start', payload: { userId: 'user-a', matchId: 'match-1' } },
        'user-a',
      );

      expect(wsA.send).not.toHaveBeenCalled();
      expect(wsB.send).toHaveBeenCalledOnce();
    });

    it('does nothing for non-existent room', () => {
      sendToRoom('nonexistent', { type: 'error', payload: { error: 'test' } });
      // should not throw
    });
  });
});
