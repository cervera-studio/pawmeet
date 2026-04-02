import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminWss, sendToAllAdmins, setupAdminWebSocket, WS_ADMIN_CHANNEL } from './admin-ws.js';

// Mock ioredis to prevent real Redis connections
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock the rate limiter
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
    slidingWindow: vi.fn(),
  })),
}));

// Mock admin-registry to spy on sendToLocalAdmins
const mockSendToLocalAdmins = vi.fn();
const mockAddAdminConnection = vi.fn();
const mockRemoveAdminConnection = vi.fn();
const mockGetAdminConnectionCount = vi.fn().mockReturnValue(0);

vi.mock('./admin-registry.js', () => ({
  sendToLocalAdmins: (...args: unknown[]) => mockSendToLocalAdmins(...args),
  addAdminConnection: (...args: unknown[]) => mockAddAdminConnection(...args),
  removeAdminConnection: (...args: unknown[]) => mockRemoveAdminConnection(...args),
  getAdminConnectionCount: () => mockGetAdminConnectionCount(),
}));

// Mock registry for pub client
vi.mock('./registry.js', () => ({
  getWsPubClient: () => null,
  getServerId: () => 'test-server-id',
}));

describe('admin-ws', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WS_ADMIN_CHANNEL', () => {
    it('has the expected channel name', () => {
      expect(WS_ADMIN_CHANNEL).toBe('ws:admin');
    });
  });

  describe('setupAdminWebSocket', () => {
    it('creates and returns a WebSocketServer', () => {
      const wss = setupAdminWebSocket();
      expect(wss).toBeDefined();
      expect(typeof wss.on).toBe('function');
      wss.close();
    });

    it('is accessible via getAdminWss after setup', () => {
      const wss = setupAdminWebSocket();
      expect(getAdminWss()).toBe(wss);
      wss.close();
    });
  });

  describe('sendToAllAdmins', () => {
    it('calls sendToLocalAdmins with the message', () => {
      const message = { type: 'moderation_new_photo' as const, payload: { photoId: 'p-1' } };

      sendToAllAdmins(message);

      expect(mockSendToLocalAdmins).toHaveBeenCalledWith(message);
    });

    it('attempts to publish via Redis (fails gracefully when pub client is null)', () => {
      const message = { type: 'moderation_new_report' as const, payload: { reportId: 'r-1' } };

      // Should not throw even when pub client is null
      sendToAllAdmins(message);

      expect(mockSendToLocalAdmins).toHaveBeenCalledWith(message);
    });
  });
});
