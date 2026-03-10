import type { ChatMessage } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { ChatService, MessageRepository } from '../ports/index.js';
import { WS_EVENT } from '../ws/chat.js';

type Deps = {
  messageRepo: MessageRepository;
  chat: ChatService;
};

export function createSendMessage({ messageRepo, chat }: Deps) {
  return async (
    userId: string,
    matchId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<Result<{ message: ChatMessage }>> => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404));
    }

    // Insert message
    const message = await messageRepo.create({
      matchId,
      senderId: userId,
      content,
      mediaUrl: mediaUrl ?? null,
    });

    // Emit to WebSocket room
    chat.sendToRoom(matchId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: { message },
    });

    return succeed({ message });
  };
}
