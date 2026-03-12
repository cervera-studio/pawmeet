import type { WsMessage } from '@pawmeet/types';
import type { WebSocket } from 'ws';

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
export function addConnection(userId: string, ws: WebSocket) {
  let userSockets = connections.get(userId);
  if (!userSockets) {
    userSockets = new Set();
    connections.set(userId, userSockets);
  }
  userSockets.add(ws);
}

/** Remove a user connection */
export function removeConnection(userId: string, ws: WebSocket) {
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
