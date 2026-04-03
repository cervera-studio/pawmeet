import { Secret, TOTP } from 'otpauth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Need a stable encryption key for tests (at least 32 chars)
const TEST_ENCRYPTION_KEY = 'pawmeet-test-totp-encryption-key-very-long-string';

describe('totp', () => {
  beforeEach(() => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadModule() {
    return import('./totp.js');
  }

  describe('encryptSecret / decryptSecret roundtrip', () => {
    it('encrypts and decrypts a TOTP secret', async () => {
      const { encryptSecret, decryptSecret } = await loadModule();
      const secret = 'JBSWY3DPEHPK3PXP';

      const encrypted = encryptSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('produces different ciphertexts for the same secret (random IV)', async () => {
      const { encryptSecret } = await loadModule();
      const secret = 'JBSWY3DPEHPK3PXP';

      const encrypted1 = encryptSecret(secret);
      const encrypted2 = encryptSecret(secret);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptSecret with invalid format', () => {
    it('throws on invalid encrypted format', async () => {
      const { decryptSecret } = await loadModule();
      expect(() => decryptSecret('not-valid-format')).toThrow(
        'Invalid encrypted TOTP secret format',
      );
    });
  });

  describe('generateTotpSetup', () => {
    it('returns a base32 secret and otpauth URI', async () => {
      const { generateTotpSetup } = await loadModule();
      const result = generateTotpSetup('admin@pawmeet.io');

      expect(result.secret).toBeDefined();
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);

      expect(result.uri).toContain('otpauth://totp/');
      expect(result.uri).toContain('PawMeet%20Admin');
      expect(result.uri).toContain('admin%40pawmeet.io');
    });

    it('generates different secrets each time', async () => {
      const { generateTotpSetup } = await loadModule();
      const setup1 = generateTotpSetup('a@b.com');
      const setup2 = generateTotpSetup('a@b.com');

      expect(setup1.secret).not.toBe(setup2.secret);
    });
  });

  describe('verifyTotpCode', () => {
    it('accepts a valid current TOTP code', async () => {
      const { verifyTotpCode } = await loadModule();
      const secret = new Secret({ size: 20 });
      const totp = new TOTP({
        issuer: 'PawMeet Admin',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      const code = totp.generate();
      expect(verifyTotpCode(secret.base32, code)).toBe(true);
    });

    it('rejects an invalid code', async () => {
      const { verifyTotpCode } = await loadModule();
      const secret = new Secret({ size: 20 });
      expect(verifyTotpCode(secret.base32, '000000')).toBe(false);
    });

    it('rejects a code with wrong length', async () => {
      const { verifyTotpCode } = await loadModule();
      const secret = new Secret({ size: 20 });
      expect(verifyTotpCode(secret.base32, '12345')).toBe(false);
    });
  });
});
