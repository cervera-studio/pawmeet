import { beforeEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import {
  getConnections,
  getRooms,
  isUserOnline,
  joinRoom,
  leaveRoom,
  parseWsMessage,
  sendToRoom,
  sendToUser,
  WS_EVENT,
} from './chat.js';

// Mock WebSocket objects
function createMockWs(readyState = 1 /* OPEN */) {
  const sent: string[] = [];
  return {
    readyState,
    OPEN: 1,
    send: (data: string) => sent.push(data),
    sent,
    on: () => {
      /* noop */
    },
  };
}

describe('WebSocket chat utilities', () => {
  beforeEach(() => {
    // Clear all connections and rooms
    getConnections().clear();
    getRooms().clear();
  });

  describe('WS_EVENT', () => {
    it('defines all expected event types', () => {
      expect(WS_EVENT.NEW_MESSAGE).toBe('new_message');
      expect(WS_EVENT.MESSAGE_READ).toBe('message_read');
      expect(WS_EVENT.TYPING_START).toBe('typing_start');
      expect(WS_EVENT.TYPING_STOP).toBe('typing_stop');
      expect(WS_EVENT.ONLINE_STATUS).toBe('online_status');
      expect(WS_EVENT.ERROR).toBe('error');
    });
  });

  describe('parseWsMessage', () => {
    it('parses a valid message', () => {
      const msg = parseWsMessage(
        JSON.stringify({ type: 'typing_start', payload: { matchId: '123' } }),
      );
      expect(msg).toEqual({ type: 'typing_start', payload: { matchId: '123' } });
    });

    it('returns null for invalid JSON', () => {
      expect(parseWsMessage('not json')).toBeNull();
    });

    it('returns null for missing type', () => {
      expect(parseWsMessage(JSON.stringify({ payload: {} }))).toBeNull();
    });

    it('returns null for missing payload', () => {
      expect(parseWsMessage(JSON.stringify({ type: 'typing_start' }))).toBeNull();
    });
  });

  describe('Room management', () => {
    it('joins and leaves rooms', () => {
      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      const rooms = getRooms();
      expect(rooms.get('match-1')?.size).toBe(2);

      leaveRoom('match-1', 'user-a');
      expect(rooms.get('match-1')?.size).toBe(1);

      leaveRoom('match-1', 'user-b');
      expect(rooms.has('match-1')).toBe(false);
    });

    it('handles leaving a non-existent room', () => {
      leaveRoom('nonexistent', 'user-a');
      expect(getRooms().has('nonexistent')).toBe(false);
    });
  });

  describe('Connection management', () => {
    it('tracks user online status', () => {
      expect(isUserOnline('user-a')).toBe(false);

      const ws = createMockWs();
      getConnections().set('user-a', new Set([ws as unknown as WebSocket]));

      expect(isUserOnline('user-a')).toBe(true);
    });
  });

  describe('sendToUser', () => {
    it('sends data to all user connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      getConnections().set(
        'user-a',
        new Set([ws1 as unknown as WebSocket, ws2 as unknown as WebSocket]),
      );

      sendToUser('user-a', { type: WS_EVENT.NEW_MESSAGE, payload: { text: 'hi' } });

      expect(ws1.sent).toHaveLength(1);
      expect(ws2.sent).toHaveLength(1);
      expect(JSON.parse(ws1.sent[0])).toEqual({
        type: 'new_message',
        payload: { text: 'hi' },
      });
    });

    it('skips closed connections', () => {
      const ws = createMockWs(3 /* CLOSED */);
      getConnections().set('user-a', new Set([ws as unknown as WebSocket]));

      sendToUser('user-a', { type: WS_EVENT.NEW_MESSAGE, payload: {} });

      expect(ws.sent).toHaveLength(0);
    });

    it('does nothing for non-existent user', () => {
      // Should not throw
      sendToUser('nonexistent', { type: WS_EVENT.NEW_MESSAGE, payload: {} });
    });
  });

  describe('sendToRoom', () => {
    it('sends to all room participants', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      getConnections().set('user-a', new Set([wsA as unknown as WebSocket]));
      getConnections().set('user-b', new Set([wsB as unknown as WebSocket]));

      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      sendToRoom('match-1', { type: WS_EVENT.TYPING_START, payload: { userId: 'user-a' } });

      expect(wsA.sent).toHaveLength(1);
      expect(wsB.sent).toHaveLength(1);
    });

    it('excludes specified user', () => {
      const wsA = createMockWs();
      const wsB = createMockWs();
      getConnections().set('user-a', new Set([wsA as unknown as WebSocket]));
      getConnections().set('user-b', new Set([wsB as unknown as WebSocket]));

      joinRoom('match-1', 'user-a');
      joinRoom('match-1', 'user-b');

      sendToRoom(
        'match-1',
        { type: WS_EVENT.TYPING_START, payload: { userId: 'user-a' } },
        'user-a',
      );

      expect(wsA.sent).toHaveLength(0);
      expect(wsB.sent).toHaveLength(1);
    });

    it('does nothing for non-existent room', () => {
      sendToRoom('nonexistent', { type: WS_EVENT.NEW_MESSAGE, payload: {} });
      // Should not throw
    });
  });
});
