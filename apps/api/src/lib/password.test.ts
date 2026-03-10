import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('Password utilities', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash string', async () => {
      const hash = await hashPassword('TestPass123');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // bcrypt hashes start with $2b$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('generates different hashes for the same password', async () => {
      const hash1 = await hashPassword('TestPass123');
      const hash2 = await hashPassword('TestPass123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const password = 'SecurePass1';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('CorrectPass1');
      const result = await verifyPassword('WrongPass1', hash);
      expect(result).toBe(false);
    });

    it('returns false for empty password against a hash', async () => {
      const hash = await hashPassword('SomePass1');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });
});
