import type { ServerType } from '@hono/node-server';
import { WS_EVENT, type WsEvent, type WsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Ratelimit } from '@upstash/ratelimit';
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

// ── WebSocket connection rate limiting ──────────────────────────────────────────

/** Max concurrent WebSocket connections per user */
const MAX_CONCURRENT_CONNECTIONS = 5;

/** Connection rate limiter: max 10 connections per minute per user */
let _wsConnectionLimiter: Ratelimit | null = null;

async function getWsConnectionLimiter(): Promise<Ratelimit> {
  if (!_wsConnectionLimiter) {
    const { redis } = await import('../lib/redis.js');
    _wsConnectionLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1m'),
      prefix: 'rl:ws-conn',
    });
  }
  return _wsConnectionLimiter;
}

/** Check if a user exceeds WebSocket connection rate or concurrency limits */
async function isConnectionAllowed(userId: string): Promise<boolean> {
  // Check concurrent connection limit
  const existingConnections = getConnections().get(userId);
  if (existingConnections && existingConnections.size >= MAX_CONCURRENT_CONNECTIONS) {
    logger.warn('WebSocket', `User ${userId} exceeded max concurrent connections`);
    return false;
  }

  // Check connection rate limit
  try {
    const limiter = await getWsConnectionLimiter();
    const { success } = await limiter.limit(userId);
    if (!success) {
      logger.warn('WebSocket', `User ${userId} exceeded connection rate limit`);
      return false;
    }
    return true;
  } catch (err) {
    // Fail-closed: reject connection when Redis is unavailable
    logger.error('WebSocket', 'Connection rate limit check failed, blocking connection', err);
    return false;
  }
}

// Re-export public API so existing imports keep working
export { WS_EVENT, type WsEvent, type WsMessage };
export { getConnections, getRooms, isUserOnline, joinRoom, leaveRoom, sendToRoom, sendToUser };
export { parseWsMessage } from './handlers.js';

/** Set up the WebSocket server attached to an HTTP server */
export function setupWebSocket(server: ServerType) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    handleUpgrade(wss, request, socket, head);
  });

  wss.on('connection', (ws: WebSocket, userId: string) => {
    // Enforce connection rate and concurrency limits
    isConnectionAllowed(userId)
      .then((allowed) => {
        if (!allowed) {
          ws.close(1008, 'Connection rate limited');
          return;
        }
        setupConnection(ws, userId);
      })
      .catch((err) => {
        logger.error('WebSocket', 'Connection rate limit check error', err);
        ws.close(1011, 'Internal error');
      });
  });

  return wss;
}

/** Configure event handlers for an accepted WebSocket connection */
function setupConnection(ws: WebSocket, userId: string) {
  addConnection(userId, ws);

  // Notify room peers about online status
  broadcastOnlineStatus(userId, true);

  ws.on('message', (rawData) => {
    handleMessage(userId, ws, rawData.toString()).catch((err) => {
      logger.error('WebSocket', 'Message handler error', err);
    });
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
}
