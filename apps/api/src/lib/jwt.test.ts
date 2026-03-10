import { describe, expect, it } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js';

describe('JWT utilities', () => {
  const userId = 'test-user-123';

  describe('generateAccessToken', () => {
    it('generates a valid JWT string', async () => {
      const token = await generateAccessToken(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a valid JWT string', async () => {
      const token = await generateRefreshToken(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a valid access token and returns payload', async () => {
      const token = await generateAccessToken(userId);
      const payload = await verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('access');
    });

    it('rejects a refresh token used as access token', async () => {
      const token = await generateRefreshToken(userId);
      await expect(verifyAccessToken(token)).rejects.toThrow();
    });

    it('rejects a malformed token', async () => {
      await expect(verifyAccessToken('not-a-jwt')).rejects.toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies a valid refresh token and returns payload', async () => {
      const token = await generateRefreshToken(userId);
      const payload = await verifyRefreshToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('refresh');
    });

    it('rejects an access token used as refresh token', async () => {
      const token = await generateAccessToken(userId);
      await expect(verifyRefreshToken(token)).rejects.toThrow();
    });

    it('rejects a malformed token', async () => {
      await expect(verifyRefreshToken('not-a-jwt')).rejects.toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('generates both access and refresh tokens', async () => {
      const { accessToken, refreshToken } = await generateTokenPair(userId);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const accessPayload = await verifyAccessToken(accessToken);
      const refreshPayload = await verifyRefreshToken(refreshToken);

      expect(accessPayload.sub).toBe(userId);
      expect(refreshPayload.sub).toBe(userId);
    });

    it('generates different tokens for access and refresh', async () => {
      const { accessToken, refreshToken } = await generateTokenPair(userId);
      expect(accessToken).not.toBe(refreshToken);
    });
  });
});
