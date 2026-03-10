import { joinRoom, sendToRoom } from '../ws/chat.js';
import type { ChatService } from '../ports/chat-service.js';

export class WsChatService implements ChatService {
  joinRoom(matchId: string, userId: string): void {
    joinRoom(matchId, userId);
  }

  sendToRoom(matchId: string, message: unknown, excludeUserId?: string): void {
    sendToRoom(matchId, message as Parameters<typeof sendToRoom>[1], excludeUserId);
  }
}
