import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import {
  addAdminConnection,
  getAdminConnectionCount,
  removeAdminConnection,
  sendToAdmin,
  sendToLocalAdmins,
} from './admin-registry.js';

function createMockWs(readyState = 1) {
  const sent: string[] = [];
  return {
    readyState,
    get OPEN() {
      return 1;
    },
    send: vi.fn((data: string) => sent.push(data)),
    sent,
    on: vi.fn(),
    close: vi.fn(),
  } satisfies Record<string, unknown> as unknown as WebSocket & { sent: string[] };
}

// Access internal map via the public API — reset between tests by removing all connections
function clearAdminConnections() {
  // No direct clear exposed, so we rely on getAdminConnectionCount being 0 at start
  // The module state resets between test files because vitest re-imports
}

describe('admin-registry', () => {
  // Since the module has internal state, we need to track what we add and remove it
  const tracked: Array<{ adminId: string; ws: WebSocket }> = [];

  beforeEach(() => {
    for (const entry of tracked) {
      removeAdminConnection(entry.adminId, entry.ws);
    }
    tracked.length = 0;
  });

  function trackAdd(adminId: string, ws: WebSocket) {
    addAdminConnection(adminId, ws);
    tracked.push({ adminId, ws });
  }

  describe('addAdminConnection / removeAdminConnection', () => {
    it('adds and tracks a connection', () => {
      const ws = createMockWs();
      trackAdd('admin-1', ws);

      expect(getAdminConnectionCount()).toBe(1);
    });

    it('supports multiple connections per admin', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      trackAdd('admin-1', ws1);
      trackAdd('admin-1', ws2);

      expect(getAdminConnectionCount()).toBe(2);
    });

    it('supports connections from different admins', () => {
      trackAdd('admin-1', createMockWs());
      trackAdd('admin-2', createMockWs());

      expect(getAdminConnectionCount()).toBe(2);
    });

    it('removes a connection and cleans up when last one is removed', () => {
      const ws = createMockWs();
      addAdminConnection('admin-1', ws);
      removeAdminConnection('admin-1', ws);

      expect(getAdminConnectionCount()).toBe(0);
    });

    it('keeps admin entry when removing one of multiple connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      trackAdd('admin-1', ws1);
      addAdminConnection('admin-1', ws2);
      removeAdminConnection('admin-1', ws1);
      // ws2 still tracked in our cleanup array indirectly via trackAdd — update tracked
      tracked.push({ adminId: 'admin-1', ws: ws2 });

      expect(getAdminConnectionCount()).toBe(1);
    });

    it('handles removing non-existent connection gracefully', () => {
      removeAdminConnection('admin-1', createMockWs());
      expect(getAdminConnectionCount()).toBe(0);
    });
  });

  describe('sendToLocalAdmins', () => {
    it('sends message to all open admin connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      trackAdd('admin-1', ws1);
      trackAdd('admin-2', ws2);

      sendToLocalAdmins({
        type: 'moderation_new_photo',
        payload: { photoId: 'photo-1' },
      });

      expect(ws1.send).toHaveBeenCalledOnce();
      expect(ws2.send).toHaveBeenCalledOnce();

      const parsed1 = JSON.parse(ws1.sent[0]);
      expect(parsed1).toEqual({
        type: 'moderation_new_photo',
        payload: { photoId: 'photo-1' },
      });
    });

    it('skips closed connections', () => {
      const ws = createMockWs(3); // CLOSED
      trackAdd('admin-1', ws);

      sendToLocalAdmins({
        type: 'moderation_new_report',
        payload: { reportId: 'r-1' },
      });

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('does nothing when no admins are connected', () => {
      sendToLocalAdmins({
        type: 'moderation_new_photo',
        payload: { photoId: 'photo-1' },
      });
      // should not throw
    });
  });

  describe('sendToAdmin', () => {
    it('sends message to specific admin connections', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      trackAdd('admin-1', ws1);
      trackAdd('admin-2', ws2);

      sendToAdmin('admin-1', {
        type: 'moderation_new_photo',
        payload: { photoId: 'photo-1' },
      });

      expect(ws1.send).toHaveBeenCalledOnce();
      expect(ws2.send).not.toHaveBeenCalled();
    });

    it('does nothing for non-existent admin', () => {
      sendToAdmin('nonexistent', {
        type: 'moderation_new_photo',
        payload: { photoId: 'photo-1' },
      });
      // should not throw
    });

    it('skips closed connections', () => {
      const ws = createMockWs(3); // CLOSED
      trackAdd('admin-1', ws);

      sendToAdmin('admin-1', {
        type: 'moderation_new_report',
        payload: { reportId: 'r-1' },
      });

      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  describe('getAdminConnectionCount', () => {
    it('returns 0 when no connections exist', () => {
      expect(getAdminConnectionCount()).toBe(0);
    });

    it('counts all connections across all admins', () => {
      trackAdd('admin-1', createMockWs());
      trackAdd('admin-1', createMockWs());
      trackAdd('admin-2', createMockWs());

      expect(getAdminConnectionCount()).toBe(3);
    });
  });
});
