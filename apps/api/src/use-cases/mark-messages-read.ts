import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { ChatService, MessageRepository } from '../ports/index.js';
import { WS_EVENT } from '../ws/chat.js';

type Deps = {
  messageRepo: MessageRepository;
  chat: ChatService;
};

export function createMarkMessagesRead({ messageRepo, chat }: Deps) {
  return async (userId: string, matchId: string): Promise<Result<{ message: string }>> => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404));
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

    return succeed({ message: 'Messaggi segnati come letti' });
  };
}
