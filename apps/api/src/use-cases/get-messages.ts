import type { ChatMessage } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { ChatService, MessageRepository } from '../ports/index.js';

type Deps = {
  messageRepo: MessageRepository;
  chat: ChatService;
};

export function createGetMessages({ messageRepo, chat }: Deps) {
  return async (
    userId: string,
    matchId: string,
    cursor?: string,
    limit?: number,
  ): Promise<Result<{ messages: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>> => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404));
    }

    // Join room for WebSocket events
    chat.joinRoom(matchId, userId);

    const result = await messageRepo.findByMatch(matchId, cursor ?? null, limit ?? 20);

    return succeed({
      messages: result.messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  };
}
