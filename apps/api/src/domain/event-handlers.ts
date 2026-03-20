import { WS_EVENT } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { enqueueMessageToxicityCheck } from '../jobs/queue.js';
import type { ChatService, NotificationService, UserRepository } from '../ports/index.js';
import type { SupportRepository } from '../ports/support-repository.js';
import { sendToUser } from '../ws/registry.js';
import { DOMAIN_EVENT, on } from './events.js';

interface EventHandlerDeps {
  chat: ChatService;
  userRepo: UserRepository;
  notificationService: NotificationService;
  supportRepo: SupportRepository;
}

/** Register all domain event handlers. Call once at startup. */
export function registerDomainEventHandlers(deps: EventHandlerDeps): void {
  const { chat, userRepo, notificationService } = deps;

  // ── MESSAGE_SENT ─────────────────────────────────────────────────────────────

  // WS broadcast for direct messages
  on(DOMAIN_EVENT.MESSAGE_SENT, async (event) => {
    const { matchId, message } = event.payload;
    chat.sendToRoom(matchId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: { message },
    });
  });

  // Push notification for direct messages
  on(DOMAIN_EVENT.MESSAGE_SENT, async (event) => {
    const { matchId, senderId, recipientId, content } = event.payload;
    if (!recipientId) return;

    const recipient = await userRepo.findById(recipientId);
    const wantsMessageNotifs = recipient?.notificationPrefs?.messages !== false;
    if (!wantsMessageNotifs) return;

    const sender = await userRepo.findById(senderId);
    const senderName = sender?.displayName ?? 'Qualcuno';
    const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

    await notificationService.send({
      userId: recipientId,
      title: senderName,
      body: preview,
      data: { matchId, type: 'new_message' },
    });
  });

  // Toxicity check for direct messages
  on(DOMAIN_EVENT.MESSAGE_SENT, async (event) => {
    const { messageId, matchId, senderId, sanitizedContent } = event.payload;
    await enqueueMessageToxicityCheck({
      messageId,
      matchId,
      senderId,
      content: sanitizedContent,
    });
  });

  // ── GROUP_MESSAGE_SENT ───────────────────────────────────────────────────────

  // WS broadcast for group messages
  on(DOMAIN_EVENT.GROUP_MESSAGE_SENT, async (event) => {
    const { eventId, message } = event.payload;
    const roomId = `group-${eventId}`;
    chat.sendToRoom(roomId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: { message },
    });
  });

  // Push notifications for group messages
  on(DOMAIN_EVENT.GROUP_MESSAGE_SENT, async (event) => {
    const { eventId, senderId, content, participantIds } = event.payload;

    const sender = await userRepo.findById(senderId);
    const senderName = sender?.displayName ?? 'Qualcuno';
    const preview = content.length > 50 ? `${content.slice(0, 47)}...` : content;

    for (const participantId of participantIds) {
      if (participantId === senderId) continue;

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
          logger.error('DomainEvents', 'Failed to send group message notification', err),
        );
    }
  });

  // ── SUPPORT_REPLY_SENT ───────────────────────────────────────────────────────

  // WS broadcast for admin support replies
  on(DOMAIN_EVENT.SUPPORT_REPLY_SENT, async (event) => {
    const { ticketId, userId, message, isInternal } = event.payload;
    if (isInternal || !userId) return;
    sendToUser(userId, {
      type: WS_EVENT.SUPPORT_NEW_MESSAGE,
      payload: { ticketId, message },
    });
  });

  // Push notification for admin support replies
  on(DOMAIN_EVENT.SUPPORT_REPLY_SENT, async (event) => {
    const { ticketId, userId, sanitizedContent, isInternal } = event.payload;
    if (isInternal || !userId) return;

    const preview =
      sanitizedContent.length > 50 ? `${sanitizedContent.slice(0, 47)}...` : sanitizedContent;

    await notificationService.send({
      userId,
      title: 'Supporto PawMeet',
      body: preview,
      data: { ticketId, type: 'support_reply' },
    });
  });

  // ── SUPPORT_MESSAGE_SENT ─────────────────────────────────────────────────────

  // WS broadcast for user support messages (multi-device sync)
  on(DOMAIN_EVENT.SUPPORT_MESSAGE_SENT, async (event) => {
    const { ticketId, userId, message } = event.payload;
    sendToUser(userId, {
      type: WS_EVENT.SUPPORT_NEW_MESSAGE,
      payload: { ticketId, message },
    });
  });
}
