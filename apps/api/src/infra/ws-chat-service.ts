import type { WsMessage } from '@pawmeet/types';
import type { ChatService } from '../ports/chat-service.js';
import { joinRoom, sendToRoom } from '../ws/chat.js';

export class WsChatService implements ChatService {
  joinRoom(matchId: string, userId: string): void {
    joinRoom(matchId, userId);
  }

  sendToRoom(matchId: string, message: WsMessage, excludeUserId?: string): void {
    sendToRoom(matchId, message, excludeUserId);
  }
}
