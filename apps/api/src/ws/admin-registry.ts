import type { AdminWsMessage } from '@pawmeet/types';
import type { WebSocket } from 'ws';

// ── Local state (per-server instance) ────────────────────────────────────────

/** Maps adminId -> Set of their WebSocket connections */
const adminConnections = new Map<string, Set<WebSocket>>();

// ── Public API ───────────────────────────────────────────────────────────────

export function addAdminConnection(adminId: string, ws: WebSocket) {
  let sockets = adminConnections.get(adminId);
  if (!sockets) {
    sockets = new Set();
    adminConnections.set(adminId, sockets);
  }
  sockets.add(ws);
}

export function removeAdminConnection(adminId: string, ws: WebSocket) {
  const sockets = adminConnections.get(adminId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      adminConnections.delete(adminId);
    }
  }
}

/** Send a message to all local admin connections (this server only) */
export function sendToLocalAdmins(message: AdminWsMessage) {
  const data = JSON.stringify(message);
  for (const sockets of adminConnections.values()) {
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }
}

/** Send a message to a specific admin's local connections */
export function sendToAdmin(adminId: string, message: AdminWsMessage) {
  const sockets = adminConnections.get(adminId);
  if (!sockets) return;

  const data = JSON.stringify(message);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

export function getAdminConnectionCount(): number {
  let count = 0;
  for (const sockets of adminConnections.values()) {
    count += sockets.size;
  }
  return count;
}
