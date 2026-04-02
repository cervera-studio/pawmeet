import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('pseudonymize', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadModule() {
    return import('./pseudonymize.js');
  }

  describe('pseudonymizeUserId', () => {
    it('returns a 32-character hex string', async () => {
      vi.stubEnv('ANALYTICS_HASH_SALT', 'test-salt-for-hashing');
      const { pseudonymizeUserId } = await loadModule();

      const result = pseudonymizeUserId('user-123');
      expect(result).toMatch(/^[0-9a-f]{32}$/);
    });

    it('returns the same hash for the same input', async () => {
      vi.stubEnv('ANALYTICS_HASH_SALT', 'test-salt-for-hashing');
      const { pseudonymizeUserId } = await loadModule();

      const hash1 = pseudonymizeUserId('user-123');
      const hash2 = pseudonymizeUserId('user-123');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', async () => {
      vi.stubEnv('ANALYTICS_HASH_SALT', 'test-salt-for-hashing');
      const { pseudonymizeUserId } = await loadModule();

      const hash1 = pseudonymizeUserId('user-123');
      const hash2 = pseudonymizeUserId('user-456');
      expect(hash1).not.toBe(hash2);
    });

    it('uses default salt when ANALYTICS_HASH_SALT is not set', async () => {
      vi.stubEnv('ANALYTICS_HASH_SALT', '');
      vi.stubEnv('NODE_ENV', 'development');
      const { pseudonymizeUserId } = await loadModule();

      const result = pseudonymizeUserId('user-123');
      expect(result).toMatch(/^[0-9a-f]{32}$/);
    });

    it('produces different hashes with different salts', async () => {
      vi.stubEnv('ANALYTICS_HASH_SALT', 'salt-a');
      const mod1 = await loadModule();
      const hash1 = mod1.pseudonymizeUserId('user-123');

      vi.resetModules();
      vi.stubEnv('ANALYTICS_HASH_SALT', 'salt-b');
      const mod2 = await loadModule();
      const hash2 = mod2.pseudonymizeUserId('user-123');

      expect(hash1).not.toBe(hash2);
    });
  });
});
