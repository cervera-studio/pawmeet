import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import process from 'node:process';
import { logger } from '@pawmeet/utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'base64';
const SEPARATOR = ':';

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;

  const envKey = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('MESSAGE_ENCRYPTION_KEY is required for message encryption');
  }

  // Key must be exactly 32 bytes (256 bits) — accept hex (64 chars) or base64 (44 chars)
  if (envKey.length === 64) {
    _key = Buffer.from(envKey, 'hex');
  } else {
    _key = Buffer.from(envKey, 'base64');
  }

  if (_key.length !== 32) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 256 bits (32 bytes)');
  }

  return _key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: iv:authTag:ciphertext (all base64-encoded)
 */
export function encryptContent(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(
    SEPARATOR,
  );
}

/**
 * Decrypt an encrypted string (iv:authTag:ciphertext format).
 * Returns the original plaintext.
 */
export function decryptContent(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(SEPARATOR);

  if (parts.length !== 3) {
    // Not encrypted (legacy plaintext) — return as-is
    return encrypted;
  }

  try {
    const iv = Buffer.from(parts[0]!, ENCODING);
    const authTag = Buffer.from(parts[1]!, ENCODING);
    const ciphertext = Buffer.from(parts[2]!, ENCODING);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (e) {
    // Decryption failed — likely plaintext (migration period) or corrupted
    logger.warn('MessageEncryption', 'Decryption failed, returning raw content', e);
    return encrypted;
  }
}

/**
 * Check if MESSAGE_ENCRYPTION_KEY is configured.
 * If not, encryption is disabled (plaintext fallback for dev).
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.MESSAGE_ENCRYPTION_KEY;
}

/**
 * Encrypt if enabled, otherwise pass through (dev/test).
 */
export function maybeEncrypt(plaintext: string): string {
  return isEncryptionEnabled() ? encryptContent(plaintext) : plaintext;
}

/**
 * Decrypt if the content looks encrypted, otherwise pass through.
 */
export function maybeDecrypt(content: string): string {
  if (!isEncryptionEnabled()) return content;
  return decryptContent(content);
}
