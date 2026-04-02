import { AppError, fail, type Result, succeed, WS_EVENT } from '@pawmeet/types';
import type { ChatService, MessageRepository } from '../ports/index.js';

type Deps = {
  messageRepo: MessageRepository;
  chat: ChatService;
};

export function createMarkMessagesRead({ messageRepo, chat }: Deps) {
  return async (userId: string, matchId: string): Promise<Result<{ message: string }>> => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404));
    }

    // Mark as read
    await messageRepo.markAsRead(matchId, userId);

    // Notify other participants via WebSocket
    chat.sendToRoom(
      matchId,
      {
        type: WS_EVENT.MESSAGE_READ,
        payload: { matchId, readBy: userId },
      },
      userId,
    );

    return succeed({ message: 'Messages marked as read' });
  };
}
