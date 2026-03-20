import process from 'node:process';
import type { WsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import IORedis from 'ioredis';
import type { WebSocket } from 'ws';

// ── Local state (per-server instance) ──────────────────────────────────────────

/** Maps userId -> Set of their WebSocket connections (supports multiple devices) */
const connections = new Map<string, Set<WebSocket>>();

/** Maps matchId -> Set of userIds in the conversation room */
const rooms = new Map<string, Set<string>>();

// ── Redis pub/sub for cross-server broadcasting ────────────────────────────────

/** Redis channel used for cross-server WebSocket message relay */
const WS_USER_CHANNEL = 'ws:user';
const WS_ROOM_CHANNEL = 'ws:room';

type UserBroadcast = {
  targetUserId: string;
  message: WsMessage;
};

type RoomBroadcast = {
  matchId: string;
  message: WsMessage;
  excludeUserId?: string;
};

/** Unique server instance ID to avoid processing own broadcasts */
const SERVER_ID = crypto.randomUUID();

let pubClient: IORedis | null = null;
let subClient: IORedis | null = null;
let redisReady = false;

function getRedisConnectionConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };
}

/**
 * Initialize Redis pub/sub for cross-server WebSocket broadcasting.
 * Call this on server startup after `setupWebSocket`.
 * Safe to call multiple times — only initializes once.
 */
export async function initWsRedisSubscription(): Promise<void> {
  if (redisReady) return;

  try {
    const config = getRedisConnectionConfig();

    pubClient = new IORedis(config);
    subClient = new IORedis(config);

    await Promise.all([pubClient.connect(), subClient.connect()]);

    await subClient.subscribe(WS_USER_CHANNEL, WS_ROOM_CHANNEL);

    subClient.on('message', (channel: string, data: string) => {
      try {
        if (channel === WS_USER_CHANNEL) {
          const parsed = JSON.parse(data) as UserBroadcast & { serverId: string };
          // Skip messages originating from this server (already delivered locally)
          if (parsed.serverId === SERVER_ID) return;
          sendToLocalUser(parsed.targetUserId, parsed.message);
        } else if (channel === WS_ROOM_CHANNEL) {
          const parsed = JSON.parse(data) as RoomBroadcast & { serverId: string };
          if (parsed.serverId === SERVER_ID) return;
          sendToLocalRoom(parsed.matchId, parsed.message, parsed.excludeUserId);
        }
      } catch (err) {
        logger.error('WsRedis', 'Failed to handle pub/sub message', err);
      }
    });

    redisReady = true;
    logger.info(
      'WsRedis',
      `Cross-server WebSocket relay initialized (server=${SERVER_ID.slice(0, 8)})`,
    );
  } catch (err) {
    logger.error('WsRedis', 'Failed to initialize Redis pub/sub for WebSocket relay', err);
    // Graceful degradation: single-server mode still works without pub/sub
  }
}

/** Publish a user-targeted message to Redis for cross-server delivery */
async function publishUserMessage(targetUserId: string, message: WsMessage): Promise<void> {
  if (!(pubClient && redisReady)) return;
  try {
    const payload: UserBroadcast & { serverId: string } = {
      serverId: SERVER_ID,
      targetUserId,
      message,
    };
    await pubClient.publish(WS_USER_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    logger.warn('WsRedis', 'Failed to publish user message to Redis', err);
  }
}

/** Publish a room-targeted message to Redis for cross-server delivery */
async function publishRoomMessage(
  matchId: string,
  message: WsMessage,
  excludeUserId?: string,
): Promise<void> {
  if (!(pubClient && redisReady)) return;
  try {
    const payload: RoomBroadcast & { serverId: string } = {
      serverId: SERVER_ID,
      matchId,
      message,
      excludeUserId,
    };
    await pubClient.publish(WS_ROOM_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    logger.warn('WsRedis', 'Failed to publish room message to Redis', err);
  }
}

// ── Local delivery helpers ─────────────────────────────────────────────────────

/** Send a message to local connections of a user (this server only) */
function sendToLocalUser(userId: string, message: WsMessage) {
  const userSockets = connections.get(userId);
  if (!userSockets) return;

  const data = JSON.stringify(message);
  for (const ws of userSockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

/** Send a message to all local users in a room (this server only) */
function sendToLocalRoom(matchId: string, message: WsMessage, excludeUserId?: string) {
  const room = rooms.get(matchId);
  if (!room) return;

  for (const userId of room) {
    if (userId !== excludeUserId) {
      sendToLocalUser(userId, message);
    }
  }
}

// ── Public API (backward-compatible) ───────────────────────────────────────────

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

/** Check if a user is online (has at least one connection on this server) */
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

/**
 * Send a message to all connections of a user.
 * Delivers locally first, then publishes to Redis for cross-server relay.
 */
export function sendToUser(userId: string, message: WsMessage) {
  // Deliver to local connections immediately
  sendToLocalUser(userId, message);

  // Publish to Redis for other server instances
  void publishUserMessage(userId, message);
}

/**
 * Send a message to all users in a room.
 * Delivers locally first, then publishes to Redis for cross-server relay.
 */
export function sendToRoom(matchId: string, message: WsMessage, excludeUserId?: string) {
  // Deliver to local room members immediately
  sendToLocalRoom(matchId, message, excludeUserId);

  // Publish to Redis for other server instances
  void publishRoomMessage(matchId, message, excludeUserId);
}
