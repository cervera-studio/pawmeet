import { WS_EVENT } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockJoinRoom = vi.fn();
const mockSendToRoom = vi.fn();

vi.mock('../ws/chat.js', () => ({
  joinRoom: (...args: unknown[]) => mockJoinRoom(...args),
  sendToRoom: (...args: unknown[]) => mockSendToRoom(...args),
}));

import { WsChatService } from './ws-chat-service.js';

describe('WsChatService', () => {
  let service: WsChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WsChatService();
  });

  describe('joinRoom', () => {
    it('delegates to the ws registry joinRoom', () => {
      service.joinRoom('match-123', 'user-456');

      expect(mockJoinRoom).toHaveBeenCalledOnce();
      expect(mockJoinRoom).toHaveBeenCalledWith('match-123', 'user-456');
    });
  });

  describe('sendToRoom', () => {
    it('delegates to the ws registry sendToRoom with a message', () => {
      const message = {
        type: WS_EVENT.NEW_MESSAGE,
        payload: { matchId: 'match-1', message: { content: 'Hello' } },
      } as const;

      service.sendToRoom('match-1', message);

      expect(mockSendToRoom).toHaveBeenCalledOnce();
      expect(mockSendToRoom).toHaveBeenCalledWith('match-1', message, undefined);
    });

    it('passes excludeUserId to sendToRoom', () => {
      const message = {
        type: WS_EVENT.TYPING_START,
        payload: { userId: 'user-1', matchId: 'match-1' },
      } as const;

      service.sendToRoom('match-1', message, 'user-1');

      expect(mockSendToRoom).toHaveBeenCalledWith('match-1', message, 'user-1');
    });
  });
});
