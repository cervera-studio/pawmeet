import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import type { ChatService } from '../ports/index.js';
import { WS_EVENT } from '../ws/chat.js';

type Deps = {
  groupMessageRepo: GroupMessageRepository;
  chat: ChatService;
};

export function createMarkGroupMessagesRead({ groupMessageRepo, chat }: Deps) {
  return async (userId: string, eventId: string): Promise<Result<{ message: string }>> => {
    const isParticipant = await groupMessageRepo.isEventParticipant(eventId, userId);
    if (!isParticipant) {
      return fail(new AppError('NOT_PARTICIPANT', 'Non sei partecipante di questo evento', 403));
    }

    await groupMessageRepo.markAsRead(eventId, userId);

    chat.sendToRoom(
      `group-${eventId}`,
      {
        type: WS_EVENT.MESSAGE_READ,
        payload: { eventId, readBy: userId },
      },
      userId,
    );

    return succeed({ message: 'Messaggi segnati come letti' });
  };
}
