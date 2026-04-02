import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('jose', () => {
  const mockSign = vi.fn().mockResolvedValue('mock-jwt-token');
  return {
    importPKCS8: vi.fn().mockResolvedValue('mock-key'),
    SignJWT: class {
      setProtectedHeader() {
        return this;
      }
      setIssuer() {
        return this;
      }
      setSubject() {
        return this;
      }
      setAudience() {
        return this;
      }
      setIssuedAt() {
        return this;
      }
      setExpirationTime() {
        return this;
      }
      sign = mockSign;
    },
  };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { AppleTokenRevocationService } from './apple-token-revocation-service.js';

describe('AppleTokenRevocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('calls Apple revoke endpoint with correct parameters', async () => {
    const service = new AppleTokenRevocationService(
      'team-id',
      'client-id',
      'key-id',
      'fake-private-key',
    );

    await service.revokeTokens('apple-user-123');

    expect(mockFetch).toHaveBeenCalledWith('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.any(URLSearchParams) as URLSearchParams,
    });

    const body = mockFetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('client_secret')).toBe('mock-jwt-token');
  });

  it('skips revocation when credentials are not configured', async () => {
    const service = new AppleTokenRevocationService('', 'client-id', '', '');

    await service.revokeTokens('apple-user-123');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not throw when Apple returns non-OK status', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 400 }));

    const service = new AppleTokenRevocationService(
      'team-id',
      'client-id',
      'key-id',
      'fake-private-key',
    );

    await expect(service.revokeTokens('apple-user-123')).resolves.toBeUndefined();
  });

  it('does not throw when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const service = new AppleTokenRevocationService(
      'team-id',
      'client-id',
      'key-id',
      'fake-private-key',
    );

    await expect(service.revokeTokens('apple-user-123')).resolves.toBeUndefined();
  });
});
