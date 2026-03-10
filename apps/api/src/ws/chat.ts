import type { Server as HttpServer } from 'node:http';
import { WS_EVENT, type WsEvent, type WsMessage } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { handleUpgrade } from './auth.js';
import { broadcastOnlineStatus, handleMessage } from './handlers.js';
import {
  addConnection,
  getConnections,
  getRooms,
  isUserOnline,
  joinRoom,
  leaveRoom,
  removeConnection,
  sendToRoom,
  sendToUser,
} from './registry.js';

// Re-export public API so existing imports keep working
export { WS_EVENT, type WsEvent, type WsMessage };
export { getConnections, getRooms, isUserOnline, joinRoom, leaveRoom, sendToRoom, sendToUser };
export { parseWsMessage } from './handlers.js';

/** Set up the WebSocket server attached to an HTTP server */
export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    handleUpgrade(wss, request, socket, head);
  });

  wss.on('connection', (ws: WebSocket, userId: string) => {
    addConnection(userId, ws);

    // Notify room peers about online status
    broadcastOnlineStatus(userId, true);

    ws.on('message', (rawData) => {
      handleMessage(userId, ws, rawData.toString());
    });

    ws.on('close', () => {
      removeConnection(userId, ws);

      // Notify room peers about offline status
      if (!isUserOnline(userId)) {
        broadcastOnlineStatus(userId, false);
      }
    });

    ws.on('error', (e) => {
      logger.error('WebSocket', 'Connection error', e);
      removeConnection(userId, ws);
    });
  });

  return wss;
}
