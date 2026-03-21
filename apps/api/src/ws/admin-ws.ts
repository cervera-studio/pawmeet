import type { AdminWsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Ratelimit } from '@upstash/ratelimit';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { handleAdminUpgrade } from './admin-auth.js';
import {
  addAdminConnection,
  getAdminConnectionCount,
  removeAdminConnection,
  sendToLocalAdmins,
} from './admin-registry.js';

// ── Admin WS connection rate limiting ────────────────────────────────────────

/** Max concurrent admin WebSocket connections per admin */
const MAX_CONCURRENT_ADMIN_CONNECTIONS = 2;

/** Connection rate limiter: max 5 connections per minute per admin */
let _adminConnectionLimiter: Ratelimit | null = null;

async function getAdminConnectionLimiter(): Promise<Ratelimit> {
  if (!_adminConnectionLimiter) {
    const { redis } = await import('../lib/redis.js');
    _adminConnectionLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1m'),
      prefix: 'rl:ws-admin-conn',
    });
  }
  return _adminConnectionLimiter;
}

async function isAdminConnectionAllowed(adminId: string): Promise<boolean> {
  if (getAdminConnectionCount() >= MAX_CONCURRENT_ADMIN_CONNECTIONS * 50) {
    logger.warn('AdminWS', 'Global admin connection limit reached');
    return false;
  }

  try {
    const limiter = await getAdminConnectionLimiter();
    const { success } = await limiter.limit(adminId);
    if (!success) {
      logger.warn('AdminWS', `Admin ${adminId} exceeded connection rate limit`);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('AdminWS', 'Admin connection rate limit check failed, blocking connection', err);
    return false;
  }
}

// ── Heartbeat ────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL = 30_000;

// ── Admin WebSocket server ───────────────────────────────────────────────────

let adminWss: WebSocketServer | null = null;

/** Set up a separate WebSocket server for admin connections at /ws/admin */
export function setupAdminWebSocket() {
  const wss = new WebSocketServer({ noServer: true });
  adminWss = wss;

  wss.on('connection', (ws: WebSocket, adminId: string) => {
    isAdminConnectionAllowed(adminId)
      .then((allowed) => {
        if (!allowed) {
          ws.close(1008, 'Connection rate limited');
          return;
        }
        setupAdminConnection(ws, adminId);
      })
      .catch((err) => {
        logger.error('AdminWS', 'Connection rate limit check error', err);
        ws.close(1011, 'Internal error');
      });
  });

  // Heartbeat: ping all admin clients periodically
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
      const sock = ws as WebSocket & { isAlive?: boolean };
      if (sock.isAlive === false) {
        sock.terminate();
        continue;
      }
      sock.isAlive = false;
      sock.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  logger.info('AdminWS', 'Admin WebSocket server initialized');

  return wss;
}

/** Get the admin WebSocket server instance for upgrade routing */
export function getAdminWss(): WebSocketServer | null {
  return adminWss;
}

export { handleAdminUpgrade };

/** Configure event handlers for an accepted admin WebSocket connection */
function setupAdminConnection(ws: WebSocket, adminId: string) {
  const sock = ws as WebSocket & { isAlive?: boolean };
  sock.isAlive = true;
  ws.on('pong', () => {
    sock.isAlive = true;
  });

  addAdminConnection(adminId, ws);
  logger.info('AdminWS', `Admin ${adminId.slice(0, 8)} connected`);

  // Admin WS is receive-only — no message handler needed beyond heartbeat pong
  ws.on('message', () => {
    // Ignore any messages from admin clients (mutations go through tRPC)
  });

  ws.on('close', () => {
    removeAdminConnection(adminId, ws);
    logger.info('AdminWS', `Admin ${adminId.slice(0, 8)} disconnected`);
  });

  ws.on('error', (e) => {
    logger.error('AdminWS', 'Admin connection error', e);
    removeAdminConnection(adminId, ws);
  });
}

// ── Broadcasting helpers (used by routers) ───────────────────────────────────

/** Redis channel for cross-server admin message relay */
export const WS_ADMIN_CHANNEL = 'ws:admin';

/**
 * Send a message to all admin connections (local + cross-server via Redis).
 * Imported and called fire-and-forget from tRPC routers.
 */
export function sendToAllAdmins(message: AdminWsMessage) {
  // Deliver locally first
  sendToLocalAdmins(message);

  // Publish to Redis for other server instances
  void publishAdminMessage(message);
}

async function publishAdminMessage(message: AdminWsMessage): Promise<void> {
  try {
    const { getWsPubClient, getServerId } = await import('./registry.js');
    const pubClient = getWsPubClient();
    if (!pubClient) return;

    const serverId = getServerId();
    await pubClient.publish(WS_ADMIN_CHANNEL, JSON.stringify({ serverId, message }));
  } catch (err) {
    logger.warn('AdminWS', 'Failed to publish admin message to Redis', err);
  }
}
