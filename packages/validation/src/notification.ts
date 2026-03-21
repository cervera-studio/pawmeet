import { z } from 'zod';

// ── Push notification data payload ─────────────────────────────────────────

/** All valid push notification types — keep in sync with mobile handler */
export const PUSH_NOTIFICATION_TYPE = {
  NEW_MESSAGE: 'new_message',
  GROUP_MESSAGE: 'group_message',
  NEW_MATCH: 'new_match',
  NEW_FOLLOWER: 'new_follower',
  WALK_PROPOSAL: 'walk_proposal',
  WALK_RESPONSE: 'walk_response',
  WALK_CANCELLED: 'walk_cancelled',
  WALK_REMINDER: 'walk_reminder',
  WALK_OVERDUE: 'walk_overdue',
  WALK_SOS: 'walk_sos',
  EVENT_JOIN: 'event_join',
  EVENT_JOIN_REQUEST: 'event_join_request',
  EVENT_REQUEST_APPROVED: 'event_request_approved',
  EVENT_REQUEST_DECLINED: 'event_request_declined',
  EVENT_INVITE: 'event_invite',
  EVENT_REMINDER: 'event_reminder',
  EVENT_COMPLETED: 'event_completed',
  NEARBY_SUGGESTION: 'nearby_suggestion',
  SUPPORT_REPLY: 'support_reply',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMENT_REPLY: 'comment_reply',
} as const;

export type PushNotificationType =
  (typeof PUSH_NOTIFICATION_TYPE)[keyof typeof PUSH_NOTIFICATION_TYPE];

const pushNotificationTypes = Object.values(PUSH_NOTIFICATION_TYPE) as [string, ...string[]];

/**
 * Schema for the `data` field sent with Expo push notifications.
 * Constrains the payload to known types + entity IDs only — prevents
 * arbitrary data from reaching client devices.
 */
export const pushNotificationDataSchema = z
  .object({
    type: z.enum(pushNotificationTypes),
    matchId: z.string().uuid().optional(),
    walkId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    ticketId: z.string().uuid().optional(),
    postId: z.string().uuid().optional(),
    commentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
  })
  .strict();

export type PushNotificationData = z.infer<typeof pushNotificationDataSchema>;

// ── Query schemas ──────────────────────────────────────────────────────────

export const listNotificationsSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
