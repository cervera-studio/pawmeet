import type { ChallengeType, XpAction } from '@pawmeet/config';
import { XP_POINTS } from '@pawmeet/config';
import type { Result, XpSummary } from '@pawmeet/types';
import { isSuccess, WS_EVENT } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { ChatService, NotificationService, UserRepository } from '../ports/index.js';
import type { SupportRepository } from '../ports/support-repository.js';
import { DOMAIN_EVENT, on } from '../domain/events.js';

type AwardXpFn = (
  userId: string,
  action: XpAction,
  metadata?: Record<string, unknown>,
) => Promise<Result<{ xpAwarded: number; summary: XpSummary; previousLevel: string }>>;

type UpdateChallengeProgressFn = (
  userId: string,
  challengeType: ChallengeType,
  increment: number,
) => Promise<Result<unknown>>;

type CheckAndUnlockAchievementsFn = (userId: string) => Promise<Result<unknown>>;

/** Infrastructure callbacks injected from the composition root. */
interface InfraCallbacks {
  enqueueMessageToxicityCheck: (params: {
    messageId: string;
    matchId: string;
    senderId: string;
    content: string;
  }) => Promise<unknown>;
  enqueueNotification: (params: {
    userId: string;
    title: string;
    body: string;
  }) => Promise<unknown>;
  trackEvent: (
    event: string,
    userId: string,
    properties: Record<string, unknown>,
  ) => void;
  sendToUser: (userId: string, payload: unknown) => void;
}

export interface EventHandlerDeps {
  chat: ChatService;
  userRepo: UserRepository;
  notificationService: NotificationService;
  supportRepo: SupportRepository;
  awardXp: AwardXpFn;
  updateChallengeProgress: UpdateChallengeProgressFn;
  checkAndUnlockAchievements: CheckAndUnlockAchievementsFn;
  infra: InfraCallbacks;
}

/** Register all domain event handlers. Call once at startup. */
export function registerDomainEventHandlers(deps: EventHandlerDeps): void {
  const {
    chat,
    userRepo,
    notificationService,
    awardXp,
    updateChallengeProgress,
    checkAndUnlockAchievements,
    infra,
  } = deps;

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
    await infra.enqueueMessageToxicityCheck({
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
    infra.sendToUser(userId, {
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
    infra.sendToUser(userId, {
      type: WS_EVENT.SUPPORT_NEW_MESSAGE,
      payload: { ticketId, message },
    });
  });

  // ── MATCH_CREATED ──────────────────────────────────────────────────────────

  on(DOMAIN_EVENT.MATCH_CREATED, async (event) => {
    const { userId } = event.payload;
    await handleGamification(
      awardXp,
      'match_made',
      userId,
      'new_matches',
      updateChallengeProgress,
      checkAndUnlockAchievements,
      infra,
    );
  });

  // ── GROUP_EVENT_JOINED ─────────────────────────────────────────────────────

  on(DOMAIN_EVENT.GROUP_EVENT_JOINED, async (event) => {
    const { userId } = event.payload;
    await handleGamification(
      awardXp,
      'group_event_joined',
      userId,
      'group_events_joined',
      updateChallengeProgress,
      checkAndUnlockAchievements,
      infra,
    );
  });

  // ── GROUP_EVENT_CANCELLED ──────────────────────────────────────────────────

  on(DOMAIN_EVENT.GROUP_EVENT_CANCELLED, async (event) => {
    const { participantUserIds, eventTitle } = event.payload;
    for (const participantUserId of participantUserIds) {
      await notificationService
        .send({
          userId: participantUserId,
          title: 'Evento annullato',
          body: `L'evento "${eventTitle}" è stato annullato dall'organizzatore`,
        })
        .catch((err) => {
          logger.error('DomainEvents', 'Failed to send cancellation notification', err);
        });
    }
  });

  // ── WALK_COMPLETED ─────────────────────────────────────────────────────────

  on(DOMAIN_EVENT.WALK_COMPLETED, async (event) => {
    const { userId } = event.payload;
    await handleGamification(
      awardXp,
      'walk_tracked',
      userId,
      undefined,
      updateChallengeProgress,
      checkAndUnlockAchievements,
      infra,
    );
  });
}

// ── Shared gamification side-effect handler ──────────────────────────────────

async function handleGamification(
  awardXp: AwardXpFn,
  xpAction: XpAction,
  userId: string,
  challengeType: ChallengeType | undefined,
  updateChallengeProgress: UpdateChallengeProgressFn,
  checkAndUnlockAchievements: CheckAndUnlockAchievementsFn,
  infra: InfraCallbacks,
): Promise<void> {
  try {
    const res = await awardXp(userId, xpAction);
    if (isSuccess(res) && res.data.previousLevel !== res.data.summary.level) {
      infra.trackEvent('gamification_level_up', userId, {
        newLevel: res.data.summary.level,
        previousLevel: res.data.previousLevel,
        totalXp: res.data.summary.totalXp,
      });
      void infra.enqueueNotification({
        userId,
        title: 'Livello su!',
        body: `Sei diventato ${res.data.summary.level}!`,
      }).catch((e) => logger.warn('gamification', 'Side effect failed', e));
    }
    infra.trackEvent('gamification_xp_awarded', userId, {
      amount: XP_POINTS[xpAction],
      source: xpAction,
    });
  } catch (e) {
    logger.warn('gamification', 'Side effect failed', e);
  }

  if (challengeType) {
    void updateChallengeProgress(userId, challengeType, 1).catch((e) =>
      logger.warn('gamification', 'Side effect failed', e),
    );
  }
  void checkAndUnlockAchievements(userId).catch((e) =>
    logger.warn('gamification', 'Side effect failed', e),
  );
}
