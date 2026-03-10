import { describe, expect, it } from 'vitest';
import {
  EMAIL_VERIFICATION_EXPIRY_MS,
  generateToken,
  hashToken,
  PASSWORD_RESET_EXPIRY_MS,
  TOKEN_BYTES,
} from './email.js';

describe('Email utilities', () => {
  describe('generateToken', () => {
    it('generates a hex string of expected length', () => {
      const token = generateToken();
      // TOKEN_BYTES bytes = TOKEN_BYTES * 2 hex chars
      expect(token).toHaveLength(TOKEN_BYTES * 2);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });

    it('respects custom byte length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32);
    });
  });

  describe('hashToken', () => {
    it('returns a 64-char hex SHA-256 hash', async () => {
      const hash = await hashToken('test-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces the same hash for the same input', async () => {
      const hash1 = await hashToken('same-input');
      const hash2 = await hashToken('same-input');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await hashToken('input-a');
      const hash2 = await hashToken('input-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Constants', () => {
    it('EMAIL_VERIFICATION_EXPIRY_MS is 24 hours', () => {
      expect(EMAIL_VERIFICATION_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
    });

    it('PASSWORD_RESET_EXPIRY_MS is 1 hour', () => {
      expect(PASSWORD_RESET_EXPIRY_MS).toBe(60 * 60 * 1000);
    });

    it('TOKEN_BYTES is 32', () => {
      expect(TOKEN_BYTES).toBe(32);
    });
  });
});
