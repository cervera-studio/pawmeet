import type { GroupChatMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';

type Deps = {
  groupMessageRepo: GroupMessageRepository;
};

export function createSendGroupMessage({ groupMessageRepo }: Deps) {
  return async (
    userId: string,
    eventId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<Result<{ message: GroupChatMessage }>> => {
    const isParticipant = await groupMessageRepo.isEventParticipant(eventId, userId);
    if (!isParticipant) {
      return fail(new AppError('NOT_PARTICIPANT', 'Non sei partecipante di questo evento', 403));
    }

    const sanitizedContent = sanitizeContent(content);

    // Validate media URL if provided
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
      return fail(new AppError('INVALID_INPUT', 'Invalid media URL', 400));
    }

    const message = await groupMessageRepo.create({
      eventId,
      senderId: userId,
      content: sanitizedContent,
      mediaUrl: mediaUrl ?? null,
    });

    // Resolve participants for notification side effects
    const participantIds = await groupMessageRepo.getParticipantUserIds(eventId);

    // Emit domain event — WS broadcast and push notifications handled by listeners
    void emit({
      type: DOMAIN_EVENT.GROUP_MESSAGE_SENT,
      payload: {
        eventId,
        senderId: userId,
        message,
        content,
        participantIds,
      },
      timestamp: new Date(),
    });

    return succeed({ message });
  };
}
