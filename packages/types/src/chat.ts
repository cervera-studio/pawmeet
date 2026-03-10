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
} as const;

export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];

export interface WsMessage {
  type: WsEvent;
  payload: Record<string, unknown>;
}
