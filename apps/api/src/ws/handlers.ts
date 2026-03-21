import { WS_EVENT } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Ratelimit } from '@upstash/ratelimit';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import { getRooms, sendToRoom, sendToUser } from './registry.js';

const wsMessageSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

const typingPayloadSchema = z.object({
  matchId: z.uuid(),
});

const supportTypingPayloadSchema = z.object({
  ticketId: z.uuid(),
});

// ── Redis-backed rate limiter for WebSocket messages ──────────────────────────
let _wsLimiter: Ratelimit | null = null;

async function getWsLimiter(): Promise<Ratelimit> {
  if (!_wsLimiter) {
    const { redis } = await import('../lib/redis.js');
    _wsLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1m'),
      prefix: 'rl:ws',
    });
  }
  return _wsLimiter;
}

async function isWsRateLimited(userId: string): Promise<boolean> {
  try {
    const limiter = await getWsLimiter();
    const { success } = await limiter.limit(userId);
    return !success;
  } catch (err) {
    // If Redis is unavailable, reject the message (fail-closed)
    logger.error('WebSocket', 'Rate limit check failed, blocking message', err);
    return true;
  }
}

// ── TTL cache for ticket ownership (avoids DB hit on every keystroke) ─────────

interface CachedOwner {
  ownerUserId: string | null;
  expiresAt: number;
}

const TICKET_OWNER_TTL_MS = 30_000; // 30 seconds
const ticketOwnerCache = new Map<string, CachedOwner>();

async function getTicketOwnerCached(ticketId: string): Promise<string | null> {
  const cached = ticketOwnerCache.get(ticketId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ownerUserId;
  }

  const { supportRepo } = await import('../container/services.js');
  const ownerUserId = await supportRepo.getTicketOwnerUserId(ticketId);

  ticketOwnerCache.set(ticketId, {
    ownerUserId,
    expiresAt: Date.now() + TICKET_OWNER_TTL_MS,
  });

  return ownerUserId;
}

/** Parse and validate an incoming WebSocket message */
export function parseWsMessage(
  data: string,
): { type: string; payload: Record<string, unknown> } | null {
  try {
    return wsMessageSchema.parse(JSON.parse(data));
  } catch {
    logger.warn('WebSocket', 'Failed to parse incoming message', null);
    return null;
  }
}

/** Handle typing start/stop events by relaying to room peers (only if user is in the room) */
export function handleTyping(
  userId: string,
  matchId: string,
  type: typeof WS_EVENT.TYPING_START | typeof WS_EVENT.TYPING_STOP,
) {
  const room = getRooms().get(matchId);
  if (!room?.has(userId)) return;
  sendToRoom(matchId, { type, payload: { userId, matchId } }, userId);
}

/** Handle support typing start/stop events by relaying to the ticket owner */
export async function handleSupportTyping(
  userId: string,
  ticketId: string,
  type: typeof WS_EVENT.SUPPORT_TYPING_START | typeof WS_EVENT.SUPPORT_TYPING_STOP,
) {
  const ownerUserId = await getTicketOwnerCached(ticketId);
  if (!ownerUserId) return;

  // Authorization: only the ticket owner or an admin can emit typing for this ticket.
  // The ticket owner types → broadcast to admin (handled via HTTP polling, no WS needed).
  // An admin types → broadcast to the ticket owner.
  // Any other user is unauthorized — silently drop.
  if (userId === ownerUserId) {
    // User is the owner — admins use HTTP polling, nothing to broadcast
    return;
  }

  // Check if sender is an admin (lazy-import to avoid circular dependency)
  const { adminUserRepo } = await import('../container/services.js');
  const admin = await adminUserRepo.findById(userId);
  if (!admin) {
    // Not the owner and not an admin — unauthorized, silently drop
    logger.warn(
      'WebSocket',
      `Unauthorized support typing: user ${userId} is not owner or admin for ticket ${ticketId}`,
    );
    return;
  }

  sendToUser(ownerUserId, { type, payload: { ticketId } });
}

/** Handle incoming WebSocket messages from an authenticated user */
export async function handleMessage(userId: string, ws: WebSocket, data: string) {
  // Rate limit WebSocket messages per user
  if (await isWsRateLimited(userId)) {
    ws.send(JSON.stringify({ type: WS_EVENT.ERROR, payload: { error: 'Rate limited' } }));
    return;
  }

  const message = parseWsMessage(data);
  if (!message) {
    ws.send(JSON.stringify({ type: WS_EVENT.ERROR, payload: { error: 'Invalid message format' } }));
    return;
  }

  const { type } = message;
  if (type === WS_EVENT.TYPING_START || type === WS_EVENT.TYPING_STOP) {
    const result = typingPayloadSchema.safeParse(message.payload);
    if (result.success) {
      handleTyping(userId, result.data.matchId, type);
    }
  } else if (type === WS_EVENT.SUPPORT_TYPING_START || type === WS_EVENT.SUPPORT_TYPING_STOP) {
    const result = supportTypingPayloadSchema.safeParse(message.payload);
    if (result.success) {
      void handleSupportTyping(userId, result.data.ticketId, type);
    }
  }
  // Other message types are handled via REST API
}

/** Broadcast online/offline status to all rooms the user belongs to */
export function broadcastOnlineStatus(userId: string, online: boolean) {
  for (const [matchId, room] of getRooms()) {
    if (room.has(userId)) {
      sendToRoom(matchId, { type: WS_EVENT.ONLINE_STATUS, payload: { userId, online } }, userId);
    }
  }
}
