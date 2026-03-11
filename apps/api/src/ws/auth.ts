import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { logger } from '@dogwalk/utils';
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
