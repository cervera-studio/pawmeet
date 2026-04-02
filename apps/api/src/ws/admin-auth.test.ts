import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket, WebSocketServer } from 'ws';
import { handleAdminUpgrade } from './admin-auth.js';

// Mock jwt verification
const mockVerifyAdminAccessToken = vi.fn();
vi.mock('../lib/jwt.js', () => ({
  verifyAdminAccessToken: (...args: unknown[]) => mockVerifyAdminAccessToken(...args),
}));

// Mock origins
vi.mock('../constants/origins.js', () => ({
  getAllowedOrigins: () => ['http://localhost:3000', 'https://den.pawmeet.io'],
}));

function createMockRequest(headers: Record<string, string> = {}) {
  return {
    headers: { host: 'localhost:3000', ...headers },
  } satisfies Record<string, unknown> as unknown as IncomingMessage;
}

function createMockSocket() {
  return {
    destroy: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  } satisfies Record<string, unknown> as unknown as Duplex;
}

function createMockWss() {
  return {
    handleUpgrade: vi.fn(
      (_req: IncomingMessage, _socket: Duplex, _head: Buffer, cb: (ws: WebSocket) => void) => {
        cb({} as WebSocket);
      },
    ),
    emit: vi.fn(),
  } satisfies Record<string, unknown> as unknown as WebSocketServer;
}

describe('admin-auth - handleAdminUpgrade', () => {
  const head = Buffer.alloc(0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('destroys socket when no token is provided', async () => {
    const socket = createMockSocket();
    const request = createMockRequest();
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('extracts token from Sec-WebSocket-Protocol header', async () => {
    mockVerifyAdminAccessToken.mockResolvedValue({ sub: 'admin-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      'sec-websocket-protocol': 'access_token.admin-jwt-token',
    });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(mockVerifyAdminAccessToken).toHaveBeenCalledWith('admin-jwt-token');
    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(wss.emit).toHaveBeenCalledWith('connection', expect.anything(), 'admin-1');
  });

  it('extracts token from Authorization header', async () => {
    mockVerifyAdminAccessToken.mockResolvedValue({ sub: 'admin-2' });
    const socket = createMockSocket();
    const request = createMockRequest({ authorization: 'Bearer admin-bearer-token' });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(mockVerifyAdminAccessToken).toHaveBeenCalledWith('admin-bearer-token');
    expect(wss.handleUpgrade).toHaveBeenCalled();
  });

  it('destroys socket on authentication failure', async () => {
    mockVerifyAdminAccessToken.mockRejectedValue(new Error('Invalid admin token'));
    const socket = createMockSocket();
    const request = createMockRequest({ authorization: 'Bearer bad-token' });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('rejects connection from unauthorized origin', async () => {
    const socket = createMockSocket();
    const request = createMockRequest({
      origin: 'https://evil.com',
      authorization: 'Bearer valid-token',
    });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('allows connection from authorized origin', async () => {
    mockVerifyAdminAccessToken.mockResolvedValue({ sub: 'admin-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      origin: 'https://den.pawmeet.io',
      authorization: 'Bearer valid-token',
    });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it('allows connection with no origin header (non-browser clients)', async () => {
    mockVerifyAdminAccessToken.mockResolvedValue({ sub: 'admin-1' });
    const socket = createMockSocket();
    const request = createMockRequest({ authorization: 'Bearer valid-token' });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it('prefers Sec-WebSocket-Protocol over Authorization header', async () => {
    mockVerifyAdminAccessToken.mockResolvedValue({ sub: 'admin-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      'sec-websocket-protocol': 'access_token.protocol-token',
      authorization: 'Bearer bearer-token',
    });
    const wss = createMockWss();

    await handleAdminUpgrade(wss, request, socket, head);

    expect(mockVerifyAdminAccessToken).toHaveBeenCalledWith('protocol-token');
  });
});
