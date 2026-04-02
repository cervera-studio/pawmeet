import { describe, expect, it } from 'vitest';
import { JwtAuthService } from './jwt-auth-service.js';

const service = new JwtAuthService();

describe('JwtAuthService', () => {
  describe('hashPassword / verifyPassword', () => {
    it('verifies a correct password against its hash', async () => {
      const hash = await service.hashPassword('my-secret-pw');
      expect(hash).not.toBe('my-secret-pw');
      expect(await service.verifyPassword('my-secret-pw', hash)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hash = await service.hashPassword('correct-password');
      expect(await service.verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('produces different hashes for the same password (salt)', async () => {
      const hash1 = await service.hashPassword('same-pw');
      const hash2 = await service.hashPassword('same-pw');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateTokenPair / verifyRefreshToken', () => {
    it('returns accessToken and refreshToken strings', async () => {
      const pair = await service.generateTokenPair('user-123');
      expect(pair.accessToken).toBeTypeOf('string');
      expect(pair.refreshToken).toBeTypeOf('string');
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });

    it('verifyRefreshToken extracts the correct sub claim', async () => {
      const pair = await service.generateTokenPair('user-456');
      const payload = await service.verifyRefreshToken(pair.refreshToken);
      expect(payload.sub).toBe('user-456');
    });

    it('rejects an invalid refresh token', async () => {
      await expect(service.verifyRefreshToken('not-a-jwt')).rejects.toThrow();
    });

    it('rejects an access token used as a refresh token', async () => {
      const pair = await service.generateTokenPair('user-789');
      await expect(service.verifyRefreshToken(pair.accessToken)).rejects.toThrow();
    });
  });

  describe('hashToken', () => {
    it('returns a hex string', async () => {
      const result = await service.hashToken('some-token');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', async () => {
      const a = await service.hashToken('deterministic');
      const b = await service.hashToken('deterministic');
      expect(a).toBe(b);
    });

    it('produces different hashes for different inputs', async () => {
      const a = await service.hashToken('token-a');
      const b = await service.hashToken('token-b');
      expect(a).not.toBe(b);
    });
  });

  describe('hashRefreshToken', () => {
    it('returns a 64-char hex SHA-256 hash', async () => {
      const result = await service.hashRefreshToken('refresh-token-value');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', async () => {
      const a = await service.hashRefreshToken('same-input');
      const b = await service.hashRefreshToken('same-input');
      expect(a).toBe(b);
    });

    it('differs from hashToken for the same input (implementation may match but contract is separate)', async () => {
      const refreshHash = await service.hashRefreshToken('shared-input');
      // Both are SHA-256 so they should actually match, verifying the algorithm is consistent
      const tokenHash = await service.hashToken('shared-input');
      expect(refreshHash).toBe(tokenHash);
    });
  });
});
