import type { SupportMessage } from './support.js';

/** Persisted statuses (DB CHECK constraint: sent | delivered | read). */
export type PersistedMessageStatus = 'sent' | 'delivered' | 'read';

/** Client-only statuses added for optimistic UI — never stored in DB. */
export type MessageStatus = PersistedMessageStatus | 'sending' | 'failed';

export interface ChatMessageReplyPreview {
  id: string;
  content: string;
  senderName: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  replyTo: ChatMessageReplyPreview | null;
  status: MessageStatus;
  isDeleted: boolean;
  createdAt: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export const REACTION_EMOJI = {
  HEART: '\u2764\uFE0F',
  LAUGH: '\uD83D\uDE02',
  FIRE: '\uD83D\uDD25',
  PAW: '\uD83D\uDC3E',
  SAD: '\uD83D\uDE22',
  THUMBS_UP: '\uD83D\uDC4D',
} as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[keyof typeof REACTION_EMOJI];

// --- WebSocket event types (shared between server and client) ---

export const WS_EVENT = {
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  ONLINE_STATUS: 'online_status',
  ERROR: 'error',
  MESSAGE_REACTION: 'message_reaction',
  // Support events
  SUPPORT_NEW_MESSAGE: 'support_new_message',
  SUPPORT_TYPING_START: 'support_typing_start',
  SUPPORT_TYPING_STOP: 'support_typing_stop',
  SUPPORT_MESSAGES_READ: 'support_messages_read',
  // Feed events
  FEED_NEW_POST: 'feed_new_post',
  FEED_POST_LIKED: 'feed_post_liked',
  FEED_POST_COMMENTED: 'feed_post_commented',
  FEED_NEW_STORY: 'feed_new_story',
} as const;

export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];

export type WsMessage =
  | {
      type: typeof WS_EVENT.NEW_MESSAGE;
      payload: { matchId?: string; message: ChatMessage | unknown };
    }
  | {
      type: typeof WS_EVENT.MESSAGE_READ;
      payload: { matchId?: string; eventId?: string; readBy?: string; messageIds?: string[] };
    }
  | { type: typeof WS_EVENT.TYPING_START; payload: { userId: string; matchId: string } }
  | { type: typeof WS_EVENT.TYPING_STOP; payload: { userId: string; matchId: string } }
  | { type: typeof WS_EVENT.ONLINE_STATUS; payload: { userId: string; online: boolean } }
  | { type: typeof WS_EVENT.ERROR; payload: { error: string } }
  | {
      type: typeof WS_EVENT.MESSAGE_REACTION;
      payload: { matchId: string; messageId: string; emoji: ReactionEmoji; userId: string };
    }
  | {
      type: typeof WS_EVENT.SUPPORT_NEW_MESSAGE;
      payload: { ticketId: string; message: SupportMessage };
    }
  | { type: typeof WS_EVENT.SUPPORT_TYPING_START; payload: { ticketId: string } }
  | { type: typeof WS_EVENT.SUPPORT_TYPING_STOP; payload: { ticketId: string } }
  | {
      type: typeof WS_EVENT.SUPPORT_MESSAGES_READ;
      payload: { ticketId: string; readAt: string };
    }
  | { type: typeof WS_EVENT.FEED_NEW_POST; payload: { postId: string; authorId: string } }
  | { type: typeof WS_EVENT.FEED_POST_LIKED; payload: { postId: string; likerName: string } }
  | {
      type: typeof WS_EVENT.FEED_POST_COMMENTED;
      payload: { postId: string; commenterName: string };
    }
  | { type: typeof WS_EVENT.FEED_NEW_STORY; payload: { authorId: string } };
