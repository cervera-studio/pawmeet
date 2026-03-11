export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  status: MessageStatus;
  isDeleted: boolean;
  createdAt: Date;
}

// --- WebSocket event types (shared between server and client) ---

export const WS_EVENT = {
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  ONLINE_STATUS: 'online_status',
  ERROR: 'error',
  // Feed events
  FEED_NEW_POST: 'feed_new_post',
  FEED_POST_LIKED: 'feed_post_liked',
  FEED_POST_COMMENTED: 'feed_post_commented',
  FEED_NEW_STORY: 'feed_new_story',
} as const;

export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];

export interface WsMessage {
  type: WsEvent;
  payload: Record<string, unknown>;
}
