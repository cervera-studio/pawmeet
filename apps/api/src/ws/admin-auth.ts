import type { IncomingMessage } from 'node:http';
import process from 'node:process';
import type { Duplex } from 'node:stream';
import { logger } from '@pawmeet/utils';
import type { WebSocketServer } from 'ws';
import { verifyAdminAccessToken } from '../lib/jwt.js';

/**
 * Extract JWT from WebSocket handshake.
 * Same strategy as user WS auth (Sec-WebSocket-Protocol / Authorization header).
 */
function extractToken(request: IncomingMessage): string | null {
  const protocols = request.headers['sec-websocket-protocol'];
  if (protocols) {
    const parts = protocols.split(',').map((p) => p.trim());
    const tokenProtocol = parts.find((p) => p.startsWith('access_token.'));
    if (tokenProtocol) {
      return tokenProtocol.slice('access_token.'.length);
    }
  }

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/** Allowed origins for admin WebSocket connections */
const ALLOWED_ADMIN_WS_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? ['https://pawmeet-admin.vercel.app']
    : ['http://localhost:3001'];

/** Handle HTTP -> WebSocket upgrade for admin connections */
export async function handleAdminUpgrade(
  wss: WebSocketServer,
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  // Validate Origin header (admin browsers only — no mobile clients)
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ADMIN_WS_ORIGINS.includes(origin)) {
    logger.warn('AdminWS', `Rejected connection from unauthorized origin: ${origin}`);
    socket.destroy();
    return;
  }

  const token = extractToken(request);
  if (!token) {
    socket.destroy();
    return;
  }

  try {
    const payload = await verifyAdminAccessToken(token);
    const adminId = payload.sub;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, adminId);
    });
  } catch (e) {
    logger.warn('AdminWS', 'Admin authentication failed during upgrade', e);
    socket.destroy();
  }
}
