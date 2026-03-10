import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { logger } from '@dogwalk/utils';
import type { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../lib/jwt.js';

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
  } catch (e) {
    logger.warn('WebSocket', 'Authentication failed during upgrade', e);
    socket.destroy();
  }
}
