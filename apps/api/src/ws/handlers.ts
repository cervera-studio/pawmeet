import { WS_EVENT, type WsMessage } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import type { WebSocket } from 'ws';
import { getRooms, sendToRoom } from './registry.js';

/** Parse and validate an incoming WebSocket message */
export function parseWsMessage(data: string): WsMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed.type === 'string' && parsed.payload) {
      return parsed as WsMessage;
    }
    return null;
  } catch (e) {
    logger.warn('WebSocket', 'Failed to parse incoming message', e);
    return null;
  }
}

/** Handle typing start/stop events by relaying to room peers */
export function handleTyping(userId: string, matchId: string, type: WsMessage['type']) {
  sendToRoom(matchId, { type, payload: { userId, matchId } }, userId);
}

/** Handle incoming WebSocket messages from an authenticated user */
export function handleMessage(userId: string, ws: WebSocket, data: string) {
  const message = parseWsMessage(data);
  if (!message) {
    ws.send(JSON.stringify({ type: WS_EVENT.ERROR, payload: { error: 'Invalid message format' } }));
    return;
  }

  switch (message.type) {
    case WS_EVENT.TYPING_START:
    case WS_EVENT.TYPING_STOP: {
      const matchId = message.payload.matchId as string;
      if (matchId) {
        handleTyping(userId, matchId, message.type);
      }
      break;
    }
    default:
      // Other message types are handled via REST API
      break;
  }
}

/** Broadcast online/offline status to all rooms the user belongs to */
export function broadcastOnlineStatus(userId: string, online: boolean) {
  for (const [matchId, room] of getRooms()) {
    if (room.has(userId)) {
      sendToRoom(matchId, { type: WS_EVENT.ONLINE_STATUS, payload: { userId, online } }, userId);
    }
  }
}
