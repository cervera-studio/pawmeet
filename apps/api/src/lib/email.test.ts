import { describe, expect, it } from 'vitest';
import { hashToken } from './email.js';

describe('Email utilities', () => {
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
});
