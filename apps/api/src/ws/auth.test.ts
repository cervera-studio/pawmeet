import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket, WebSocketServer } from 'ws';
import { handleUpgrade } from './auth.js';

// Mock jwt verification
const mockVerifyAccessToken = vi.fn();
vi.mock('../lib/jwt.js', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

// Mock origins
vi.mock('../constants/origins.js', () => ({
  getAllowedOrigins: () => ['http://localhost:3000', 'http://localhost:3001'],
}));

function createMockRequest(overrides: Partial<IncomingMessage> = {}) {
  return {
    url: '/ws',
    headers: {
      host: 'localhost:3000',
      ...((overrides as { headers?: Record<string, string> }).headers ?? {}),
    },
    ...overrides,
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

describe('auth - handleUpgrade', () => {
  const head = Buffer.alloc(0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('destroys socket when path is not /ws', async () => {
    const socket = createMockSocket();
    const request = createMockRequest({ url: '/other-path' });
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('destroys socket when no token is provided', async () => {
    const socket = createMockSocket();
    const request = createMockRequest();
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('extracts token from Sec-WebSocket-Protocol header', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        'sec-websocket-protocol': 'access_token.my-jwt-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('my-jwt-token');
    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(wss.emit).toHaveBeenCalledWith('connection', expect.anything(), 'user-1');
  });

  it('extracts token from Authorization header', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-2' });
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer my-bearer-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('my-bearer-token');
    expect(wss.handleUpgrade).toHaveBeenCalled();
  });

  it('prefers Sec-WebSocket-Protocol over Authorization header', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        'sec-websocket-protocol': 'access_token.protocol-token',
        authorization: 'Bearer bearer-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('protocol-token');
  });

  it('destroys socket on authentication failure', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer invalid-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('rejects unauthorized origin for non-subprotocol auth', async () => {
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        origin: 'https://evil.com',
        authorization: 'Bearer valid-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('allows authorized origin for non-subprotocol auth', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: 'Bearer valid-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(wss.handleUpgrade).toHaveBeenCalled();
  });

  it('skips origin check for subprotocol-authenticated connections', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });
    const socket = createMockSocket();
    const request = createMockRequest({
      headers: {
        host: 'localhost:3000',
        origin: 'https://some-mobile-origin.com',
        'sec-websocket-protocol': 'access_token.mobile-token',
      },
    } as Partial<IncomingMessage>);
    const wss = createMockWss();

    await handleUpgrade(wss, request, socket, head);

    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(socket.destroy).not.toHaveBeenCalled();
  });
});
