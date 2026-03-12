import type { GroupChatMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import type { ChatService } from '../ports/index.js';

type Deps = {
  groupMessageRepo: GroupMessageRepository;
  chat: ChatService;
};

export function createGetGroupMessages({ groupMessageRepo, chat }: Deps) {
  return async (
    userId: string,
    eventId: string,
    cursor?: string,
    limit?: number,
  ): Promise<
    Result<{ messages: GroupChatMessage[]; nextCursor: string | null; hasMore: boolean }>
  > => {
    const isParticipant = await groupMessageRepo.isEventParticipant(eventId, userId);
    if (!isParticipant) {
      return fail(new AppError('NOT_PARTICIPANT', 'Non sei partecipante di questo evento', 403));
    }

    chat.joinRoom(`group-${eventId}`, userId);

    const result = await groupMessageRepo.findByEvent(eventId, cursor ?? null, limit ?? 20);

    return succeed({
      messages: result.messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  };
}
