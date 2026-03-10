export interface ChatService {
  joinRoom(matchId: string, userId: string): void;
  sendToRoom(matchId: string, message: unknown, excludeUserId?: string): void;
}
