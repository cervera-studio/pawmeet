import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Generate a deterministic 256-bit key for testing (hex-encoded = 64 chars)
const TEST_KEY_HEX = crypto.randomBytes(32).toString('hex');

describe('message-encryption', () => {
  beforeEach(() => {
    vi.stubEnv('MESSAGE_ENCRYPTION_KEY', TEST_KEY_HEX);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadModule() {
    return import('./message-encryption.js');
  }

  describe('encryptContent / decryptContent roundtrip', () => {
    it('encrypts and decrypts a simple message', async () => {
      const { encryptContent, decryptContent } = await loadModule();
      const plaintext = 'Hello, PawMeet!';

      const encrypted = encryptContent(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decryptContent(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts an empty string', async () => {
      const { encryptContent, decryptContent } = await loadModule();
      const encrypted = encryptContent('');
      const decrypted = decryptContent(encrypted);
      expect(decrypted).toBe('');
    });

    it('encrypts and decrypts unicode content', async () => {
      const { encryptContent, decryptContent } = await loadModule();
      const plaintext = 'Ciao! 🐕 Il mio cane si chiama Rex';

      const encrypted = encryptContent(plaintext);
      const decrypted = decryptContent(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', async () => {
      const { encryptContent } = await loadModule();
      const plaintext = 'same message';

      const encrypted1 = encryptContent(plaintext);
      const encrypted2 = encryptContent(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptContent with legacy plaintext', () => {
    it('returns plaintext as-is when format is not iv:authTag:ciphertext', async () => {
      const { decryptContent } = await loadModule();
      expect(decryptContent('plain text message')).toBe('plain text message');
    });
  });

  describe('isEncryptionEnabled', () => {
    it('returns true when MESSAGE_ENCRYPTION_KEY is set', async () => {
      const { isEncryptionEnabled } = await loadModule();
      expect(isEncryptionEnabled()).toBe(true);
    });

    it('returns false when MESSAGE_ENCRYPTION_KEY is not set', async () => {
      vi.stubEnv('MESSAGE_ENCRYPTION_KEY', '');
      vi.resetModules();
      const { isEncryptionEnabled } = await loadModule();
      expect(isEncryptionEnabled()).toBe(false);
    });
  });

  describe('maybeEncrypt / maybeDecrypt', () => {
    it('encrypts and decrypts when key is configured', async () => {
      const { maybeEncrypt, maybeDecrypt } = await loadModule();
      const plaintext = 'secret message';

      const result = maybeEncrypt(plaintext);
      expect(result).not.toBe(plaintext);

      const decrypted = maybeDecrypt(result);
      expect(decrypted).toBe(plaintext);
    });

    it('passes through when key is not configured', async () => {
      vi.stubEnv('MESSAGE_ENCRYPTION_KEY', '');
      vi.resetModules();
      const { maybeEncrypt, maybeDecrypt } = await loadModule();
      const plaintext = 'not encrypted';

      expect(maybeEncrypt(plaintext)).toBe(plaintext);
      expect(maybeDecrypt(plaintext)).toBe(plaintext);
    });
  });

  describe('key format support', () => {
    it('accepts base64-encoded keys', async () => {
      const base64Key = crypto.randomBytes(32).toString('base64');
      vi.stubEnv('MESSAGE_ENCRYPTION_KEY', base64Key);
      vi.resetModules();

      const { encryptContent, decryptContent } = await loadModule();
      const plaintext = 'base64 key test';
      const encrypted = encryptContent(plaintext);
      expect(decryptContent(encrypted)).toBe(plaintext);
    });
  });
});
