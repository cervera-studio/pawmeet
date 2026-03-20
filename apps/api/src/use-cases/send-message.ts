import type { ChatMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type { MatchRepository, MessageRepository } from '../ports/index.js';

type Deps = {
  messageRepo: MessageRepository;
  matchRepo: MatchRepository;
};

export function createSendMessage({ messageRepo, matchRepo }: Deps) {
  return async (
    userId: string,
    matchId: string,
    content: string,
    mediaUrl?: string,
    replyToId?: string,
  ): Promise<
    Result<{ message: ChatMessage; chatAgeHours: number; messageCountInChat: number }>
  > => {
    // Check participation
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404));
    }

    const sanitizedContent = sanitizeContent(content);

    // Validate media URL if provided
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
      return fail(new AppError('INVALID_INPUT', 'Invalid media URL', 400));
    }

    // Insert message
    const message = await messageRepo.create({
      matchId,
      senderId: userId,
      content: sanitizedContent,
      mediaUrl: mediaUrl ?? null,
      replyToId: replyToId ?? null,
    });

    // Resolve recipient for side effects
    const recipientId = await messageRepo.getOtherParticipant(matchId, userId);

    // Emit domain event — all side effects (WS broadcast, push, toxicity) are handled by listeners
    void emit({
      type: DOMAIN_EVENT.MESSAGE_SENT,
      payload: {
        messageId: message.id,
        matchId,
        senderId: userId,
        recipientId,
        message,
        content,
        sanitizedContent,
      },
      timestamp: new Date(),
    });

    // Compute analytics metadata
    const match = await matchRepo.findById(matchId);
    const chatAgeHours = match
      ? Math.floor((Date.now() - new Date(match.createdAt).getTime()) / (1000 * 60 * 60))
      : 0;
    const messageCountInChat = await messageRepo.countByMatch(matchId);

    logger.info('SendMessage', 'Message sent', { userId, matchId });

    return succeed({ message, chatAgeHours, messageCountInChat });
  };
}
