import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('jose', () => ({
  importPKCS8: vi.fn().mockResolvedValue('mock-private-key'),
  SignJWT: class MockSignJWT {
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
    async sign() {
      return 'mock-jwt-assertion';
    }
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import type { IntegrityVerdict } from '../ports/play-integrity-verifier.js';
import { GooglePlayIntegrityVerifier } from './google-play-integrity-verifier.js';

const PACKAGE_NAME = 'com.example.app';
const CLIENT_EMAIL = 'sa@project.iam.gserviceaccount.com';
const PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

function createVerdict(): IntegrityVerdict {
  return {
    requestDetails: {
      requestPackageName: PACKAGE_NAME,
      requestHash: 'abc123',
      timestampMillis: '1700000000000',
    },
    appIntegrity: {
      appRecognitionVerdict: 'PLAY_RECOGNIZED',
      packageName: PACKAGE_NAME,
      certificateSha256Digest: ['sha256-digest'],
      versionCode: '10',
    },
    deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] },
    accountDetails: { appLicensingVerdict: 'LICENSED' },
  };
}

describe('GooglePlayIntegrityVerifier', () => {
  let verifier: GooglePlayIntegrityVerifier;

  beforeEach(() => {
    vi.clearAllMocks();
    verifier = new GooglePlayIntegrityVerifier(PACKAGE_NAME, CLIENT_EMAIL, PRIVATE_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockTokenExchange(accessToken = 'access-token-123', expiresIn = 3600): void {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn }), {
        status: 200,
      }),
    );
  }

  function mockIntegrityDecode(verdict: IntegrityVerdict): void {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ tokenPayloadExternal: verdict }), { status: 200 }),
    );
  }

  it('exchanges a JWT for an access token and calls the integrity API', async () => {
    const verdict = createVerdict();
    mockTokenExchange();
    mockIntegrityDecode(verdict);

    const result = await verifier.verify('integrity-token-xyz');

    expect(result).toEqual(verdict);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call: OAuth2 token exchange
    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[0]).toBe('https://oauth2.googleapis.com/token');

    // Second call: Integrity API
    const integrityCall = mockFetch.mock.calls[1];
    expect(integrityCall[0]).toContain(PACKAGE_NAME);
    expect(integrityCall[0]).toContain('decodeIntegrityToken');
  });

  it('caches the access token for subsequent calls', async () => {
    const verdict = createVerdict();
    mockTokenExchange();
    mockIntegrityDecode(verdict);
    mockIntegrityDecode(verdict);

    await verifier.verify('token-1');
    await verifier.verify('token-2');

    // Token exchange should only happen once (first call)
    // Two integrity API calls + one token exchange = 3 total
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws when the integrity API returns a non-OK status', async () => {
    mockTokenExchange();
    mockFetch.mockResolvedValueOnce(new Response('{"error":"invalid_token"}', { status: 400 }));

    await expect(verifier.verify('bad-token')).rejects.toThrow('Play Integrity API returned 400');
  });

  it('throws when the token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(verifier.verify('some-token')).rejects.toThrow(
      'Google OAuth2 token exchange failed: 401',
    );
  });

  it('sends the integrity token in the request body', async () => {
    mockTokenExchange();
    mockIntegrityDecode(createVerdict());

    await verifier.verify('my-integrity-token');

    const integrityCall = mockFetch.mock.calls[1];
    const body = JSON.parse(integrityCall[1].body as string) as { integrity_token: string };
    expect(body.integrity_token).toBe('my-integrity-token');
  });
});
