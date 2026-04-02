import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockJwtVerify, mockFetch } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: mockJwtVerify,
}));

vi.stubGlobal('fetch', mockFetch);

import { JwksSocialAuthVerifier } from './jwks-social-auth-verifier.js';

const APPLE_BUNDLE_ID = 'com.example.pawmeet';
const GOOGLE_CLIENT_ID = '123456.apps.googleusercontent.com';

describe('JwksSocialAuthVerifier', () => {
  let verifier: JwksSocialAuthVerifier;

  beforeEach(() => {
    vi.clearAllMocks();
    verifier = new JwksSocialAuthVerifier(APPLE_BUNDLE_ID, GOOGLE_CLIENT_ID);
  });

  describe('verify (Apple)', () => {
    it('returns payload with email from Apple ID token', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'apple-user-001',
          email: 'user@icloud.com',
          email_verified: 'true',
        },
      });

      const result = await verifier.verify('apple', 'apple-id-token');

      expect(result).toEqual({
        email: 'user@icloud.com',
        emailVerified: true,
        providerUserId: 'apple-user-001',
        displayName: null,
      });
    });

    it('handles missing email (subsequent Apple logins)', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-user-002' },
      });

      const result = await verifier.verify('apple', 'apple-token-no-email');

      expect(result.email).toBeNull();
      expect(result.emailVerified).toBe(false);
    });

    it('verifies nonce when provided', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-user-003', nonce: 'correct-nonce' },
      });

      const result = await verifier.verify('apple', 'token', 'correct-nonce');
      expect(result.providerUserId).toBe('apple-user-003');
    });

    it('throws on nonce mismatch', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-user-004', nonce: 'real-nonce' },
      });

      await expect(verifier.verify('apple', 'token', 'wrong-nonce')).rejects.toThrow(
        'Apple ID token nonce mismatch',
      );
    });

    it('throws when sub claim is missing', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { email: 'user@icloud.com' },
      });

      await expect(verifier.verify('apple', 'token')).rejects.toThrow(
        'Apple ID token missing sub claim',
      );
    });
  });

  describe('verify (Google)', () => {
    it('returns payload with email from Google ID token', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-001',
          email: 'user@gmail.com',
          email_verified: true,
          name: 'Test User',
        },
      });

      const result = await verifier.verify('google', 'google-id-token');

      expect(result).toEqual({
        email: 'user@gmail.com',
        emailVerified: true,
        providerUserId: 'google-user-001',
        displayName: 'Test User',
      });
    });

    it('throws when Google email is missing', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'google-user-002', email_verified: true },
      });

      await expect(verifier.verify('google', 'token')).rejects.toThrow(
        'Google ID token missing email claim',
      );
    });

    it('throws when Google email is not verified', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-003',
          email: 'unverified@gmail.com',
          email_verified: false,
        },
      });

      await expect(verifier.verify('google', 'token')).rejects.toThrow(
        'Google email is not verified',
      );
    });

    it('verifies nonce when provided', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-004',
          email: 'user@gmail.com',
          email_verified: true,
          nonce: 'correct-nonce',
        },
      });

      const result = await verifier.verify('google', 'token', 'correct-nonce');
      expect(result.providerUserId).toBe('google-user-004');
    });

    it('throws on Google nonce mismatch', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-005',
          email: 'user@gmail.com',
          email_verified: true,
          nonce: 'real-nonce',
        },
      });

      await expect(verifier.verify('google', 'token', 'wrong-nonce')).rejects.toThrow(
        'Google ID token nonce mismatch',
      );
    });
  });

  describe('exchangeGoogleCode', () => {
    it('exchanges authorization code and verifies the returned ID token', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id_token: 'exchanged-id-token' }), { status: 200 }),
      );
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-010',
          email: 'exchanged@gmail.com',
          email_verified: true,
          name: 'Code User',
        },
      });

      const result = await verifier.exchangeGoogleCode({
        code: 'auth-code-123',
        codeVerifier: 'verifier-abc',
        redirectUri: 'https://app.example.com/callback',
      });

      expect(result).toEqual({
        email: 'exchanged@gmail.com',
        emailVerified: true,
        providerUserId: 'google-user-010',
        displayName: 'Code User',
      });

      // Verify the token exchange request
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://oauth2.googleapis.com/token');
      const body = new URLSearchParams(fetchCall[1].body as string);
      expect(body.get('code')).toBe('auth-code-123');
      expect(body.get('code_verifier')).toBe('verifier-abc');
      expect(body.get('grant_type')).toBe('authorization_code');
    });

    it('throws when token exchange returns non-OK', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Bad request', { status: 400 }));

      await expect(
        verifier.exchangeGoogleCode({
          code: 'bad-code',
          codeVerifier: 'v',
          redirectUri: 'https://app.example.com/callback',
        }),
      ).rejects.toThrow('Google token exchange failed: 400');
    });

    it('throws when response has no id_token', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'only-access' }), { status: 200 }),
      );

      await expect(
        verifier.exchangeGoogleCode({
          code: 'code',
          codeVerifier: 'v',
          redirectUri: 'https://app.example.com/callback',
        }),
      ).rejects.toThrow('Google token exchange: no id_token in response');
    });
  });
});
