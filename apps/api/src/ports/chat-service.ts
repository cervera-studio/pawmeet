import type { WsMessage } from '@pawmeet/types';

export interface ChatService {
  joinRoom(matchId: string, userId: string): void;
  sendToRoom(matchId: string, message: WsMessage, excludeUserId?: string): void;
}
