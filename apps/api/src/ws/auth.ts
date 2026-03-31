import type { IncomingMessage } from 'node:http';
import process from 'node:process';
import type { Duplex } from 'node:stream';
import { logger } from '@pawmeet/utils';
import type { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../lib/jwt.js';

/**
 * Extract JWT from WebSocket handshake.
 * Supports (in order of priority):
 * 1. Sec-WebSocket-Protocol header with "access_token.<jwt>" subprotocol
 * 2. Authorization header (for non-browser clients)
 */
function extractToken(request: IncomingMessage): string | null {
  // 1. Sec-WebSocket-Protocol: "access_token.<jwt>"
  const protocols = request.headers['sec-websocket-protocol'];
  if (protocols) {
    const parts = protocols.split(',').map((p) => p.trim());
    const tokenProtocol = parts.find((p) => p.startsWith('access_token.'));
    if (tokenProtocol) {
      return tokenProtocol.slice('access_token.'.length);
    }
  }

  // 2. Authorization header (non-browser clients like mobile)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/** Allowed origins for WebSocket connections (same as CORS). */
const ALLOWED_WS_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? ['https://pawmeet.io', 'https://den.pawmeet.io']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4321'];

/** Handle HTTP → WebSocket upgrade with JWT authentication */
export async function handleUpgrade(
  wss: WebSocketServer,
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  // Only handle /ws path
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const token = extractToken(request);
  if (!token) {
    socket.destroy();
    return;
  }

  // Validate Origin header to prevent cross-origin WebSocket hijacking.
  // Skip for subprotocol-authenticated connections (mobile/native clients)
  // since CSRF is not possible when the attacker cannot know the JWT.
  const hasSubprotocolAuth = request.headers['sec-websocket-protocol']
    ?.split(',')
    .some((p) => p.trim().startsWith('access_token.'));
  const origin = request.headers.origin;
  if (!hasSubprotocolAuth && origin && !ALLOWED_WS_ORIGINS.includes(origin)) {
    logger.warn('WebSocket', `Rejected connection from unauthorized origin: ${origin}`);
    socket.destroy();
    return;
  }

  try {
    const payload = await verifyAccessToken(token);
    const userId = payload.sub;

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Echo back the subprotocol so the browser accepts the connection
      wss.emit('connection', ws, userId);
    });
  } catch (e) {
    logger.warn('WebSocket', 'Authentication failed during upgrade', e);
    socket.destroy();
  }
}
