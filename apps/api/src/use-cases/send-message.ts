import type { ChatMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type {
  ChatService,
  MatchRepository,
  MessageRepository,
  NotificationService,
  UserRepository,
} from '../ports/index.js';
import { WS_EVENT } from '../ws/chat.js';

type Deps = {
  messageRepo: MessageRepository;
  matchRepo: MatchRepository;
  chat: ChatService;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createSendMessage({
  messageRepo,
  matchRepo,
  chat,
  userRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    matchId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<
    Result<{ message: ChatMessage; chatAgeHours: number; messageCountInChat: number }>
  > => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404));
    }

    const sanitizedContent = sanitizeContent(content);

    // Validate media URL if provided
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
      return fail(new AppError('INVALID_INPUT', 'URL media non valido', 400));
    }

    // Insert message
    const message = await messageRepo.create({
      matchId,
      senderId: userId,
      content: sanitizedContent,
      mediaUrl: mediaUrl ?? null,
    });

    // Emit to WebSocket room
    chat.sendToRoom(matchId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: { message },
    });

    // Send push notification to the recipient (if they opted in)
    const recipientId = await messageRepo.getOtherParticipant(matchId, userId);
    if (recipientId) {
      const recipient = await userRepo.findById(recipientId);
      const wantsMessageNotifs = recipient?.notificationPrefs?.messages !== false;

      if (wantsMessageNotifs) {
        const sender = await userRepo.findById(userId);
        const senderName = sender?.displayName ?? 'Qualcuno';
        const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

        notificationService
          .send({
            userId: recipientId,
            title: senderName,
            body: preview,
            data: { matchId, type: 'new_message' },
          })
          .catch((err) =>
            logger.error('sendMessage', 'Failed to enqueue message notification', err),
          );
      }
    }

    // Compute analytics metadata
    const match = await matchRepo.findById(matchId);
    const chatAgeHours = match
      ? Math.floor((Date.now() - new Date(match.createdAt).getTime()) / (1000 * 60 * 60))
      : 0;
    const messageCountInChat = await messageRepo.countByMatch(matchId);

    return succeed({ message, chatAgeHours, messageCountInChat });
  };
}
