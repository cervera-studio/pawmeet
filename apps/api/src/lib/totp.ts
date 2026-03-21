import crypto from 'node:crypto';
import process from 'node:process';
import { Secret, TOTP } from 'otpauth';

const ISSUER = 'PawMeet Admin';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30;

/**
 * Encrypt a TOTP secret for DB storage using AES-256-GCM.
 * Key is derived from TOTP_ENCRYPTION_KEY env var.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.scryptSync(key, 'pawmeet-totp-salt', 32);
}

export function encryptSecret(plainSecret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = encryptedSecret.split(':');
  if (!(ivHex && authTagHex && encryptedHex)) {
    throw new Error('Invalid encrypted TOTP secret format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/** Generate a new TOTP secret and return the base32 secret + otpauth URI */
export function generateTotpSetup(email: string): { secret: string; uri: string } {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

/** Verify a TOTP code against a base32 secret. Allows 1 period of clock drift. */
export function verifyTotpCode(base32Secret: string, code: string): boolean {
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(base32Secret),
  });

  // validate() returns the time step difference (0 = exact match, ±1 = one period drift)
  // or null if invalid
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
