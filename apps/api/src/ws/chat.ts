import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { verifyAccessToken } from '../lib/jwt.js';

// --- Event types ---

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

// --- Connection registry ---

/** Maps userId → Set of their WebSocket connections (supports multiple devices) */
const connections = new Map<string, Set<WebSocket>>();

/** Maps matchId → Set of userIds in the conversation room */
const rooms = new Map<string, Set<string>>();

export function getConnections() {
  return connections;
}

export function getRooms() {
  return rooms;
}

/** Add a user connection */
function addConnection(userId: string, ws: WebSocket) {
  let userSockets = connections.get(userId);
  if (!userSockets) {
    userSockets = new Set();
    connections.set(userId, userSockets);
  }
  userSockets.add(ws);
}

/** Remove a user connection */
function removeConnection(userId: string, ws: WebSocket) {
  const userSockets = connections.get(userId);
  if (userSockets) {
    userSockets.delete(ws);
    if (userSockets.size === 0) {
      connections.delete(userId);
    }
  }
}

/** Check if a user is online (has at least one connection) */
export function isUserOnline(userId: string): boolean {
  return connections.has(userId);
}

/** Join a conversation room */
export function joinRoom(matchId: string, userId: string) {
  let room = rooms.get(matchId);
  if (!room) {
    room = new Set();
    rooms.set(matchId, room);
  }
  room.add(userId);
}

/** Leave a conversation room */
export function leaveRoom(matchId: string, userId: string) {
  const room = rooms.get(matchId);
  if (room) {
    room.delete(userId);
    if (room.size === 0) {
      rooms.delete(matchId);
    }
  }
}

/** Send a message to all connections of a user */
export function sendToUser(userId: string, message: WsMessage) {
  const userSockets = connections.get(userId);
  if (!userSockets) return;

  const data = JSON.stringify(message);
  for (const ws of userSockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

/** Send a message to all users in a room */
export function sendToRoom(matchId: string, message: WsMessage, excludeUserId?: string) {
  const room = rooms.get(matchId);
  if (!room) return;

  for (const userId of room) {
    if (userId !== excludeUserId) {
      sendToUser(userId, message);
    }
  }
}

/** Parse and validate an incoming WebSocket message */
export function parseWsMessage(data: string): WsMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed.type === 'string' && parsed.payload) {
      return parsed as WsMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/** Handle incoming WebSocket messages from an authenticated user */
function handleMessage(userId: string, ws: WebSocket, data: string) {
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
        sendToRoom(matchId, { type: message.type, payload: { userId, matchId } }, userId);
      }
      break;
    }
    default:
      // Other message types are handled via REST API
      break;
  }
}

/** Set up the WebSocket server attached to an HTTP server */
export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    // Only handle /ws path
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    // Authenticate via token query param
    const token = url.searchParams.get('token');
    if (!token) {
      socket.destroy();
      return;
    }

    try {
      const payload = await verifyAccessToken(token);
      const userId = payload.sub;

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, userId);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, userId: string) => {
    addConnection(userId, ws);

    // Notify room peers about online status
    for (const [matchId, room] of rooms) {
      if (room.has(userId)) {
        sendToRoom(
          matchId,
          { type: WS_EVENT.ONLINE_STATUS, payload: { userId, online: true } },
          userId,
        );
      }
    }

    ws.on('message', (rawData) => {
      handleMessage(userId, ws, rawData.toString());
    });

    ws.on('close', () => {
      removeConnection(userId, ws);

      // Notify room peers about offline status
      if (!isUserOnline(userId)) {
        for (const [matchId, room] of rooms) {
          if (room.has(userId)) {
            sendToRoom(
              matchId,
              { type: WS_EVENT.ONLINE_STATUS, payload: { userId, online: false } },
              userId,
            );
          }
        }
      }
    });

    ws.on('error', () => {
      removeConnection(userId, ws);
    });
  });

  return wss;
}
