import type { GroupChatMessage } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import type { ChatService, NotificationService, UserRepository } from '../ports/index.js';
import { WS_EVENT } from '../ws/chat.js';

type Deps = {
  groupMessageRepo: GroupMessageRepository;
  chat: ChatService;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createSendGroupMessage({
  groupMessageRepo,
  chat,
  userRepo,
  notificationService,
}: Deps) {
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
      return fail(new AppError('INVALID_INPUT', 'URL media non valido', 400));
    }

    const message = await groupMessageRepo.create({
      eventId,
      senderId: userId,
      content: sanitizedContent,
      mediaUrl: mediaUrl ?? null,
    });

    const roomId = `group-${eventId}`;
    chat.sendToRoom(roomId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: { message },
    });

    // Notify all other participants
    const participantIds = await groupMessageRepo.getParticipantUserIds(eventId);
    const sender = await userRepo.findById(userId);
    const senderName = sender?.displayName ?? 'Qualcuno';
    const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

    for (const participantId of participantIds) {
      if (participantId === userId) continue;

      const recipient = await userRepo.findById(participantId);
      if (recipient?.notificationPrefs?.messages === false) continue;

      notificationService
        .send({
          userId: participantId,
          title: `${senderName} (gruppo)`,
          body: preview,
          data: { eventId, type: 'group_message' },
        })
        .catch((err) =>
          logger.error('sendGroupMessage', 'Failed to enqueue group message notification', err),
        );
    }

    return succeed({ message });
  };
}
