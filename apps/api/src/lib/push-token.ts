/**
 * Push token hashing utilities.
 *
 * NOTE: Expo Push Notifications require the UNHASHED token to deliver
 * notifications (the token is an opaque address used by APNs/FCM).
 * Hashing the stored token would make `expo.sendPushNotificationsAsync()`
 * unable to route the notification, effectively breaking push delivery.
 *
 * The current architecture stores the raw push token in the `users.pushToken`
 * column and reads it back in the notification worker to send via Expo.
 * A `pushTokenHash` column approach (storing both raw + hash) adds complexity
 * without a clear security benefit — the raw token must still be persisted.
 *
 * If we move to a separate push-token table with encryption-at-rest (e.g.
 * column-level encryption via pgcrypto or application-level AES-256-GCM),
 * that would protect tokens at rest while still allowing decryption for
 * delivery. This is tracked as a future improvement.
 *
 * For now, push tokens are protected by:
 * - DB-level access controls (Neon IAM)
 * - PII scrubbing in Sentry (pushToken is in PII_FIELDS)
 * - Analytics PII rules (never included in event properties)
 * - The token itself is not a credential — it can only be used to SEND
 *   notifications to the device, not to read data.
 */

import { createHmac } from 'node:crypto';

const salt = process.env.PUSH_TOKEN_SALT;

/**
 * Hash a push token for identification/comparison purposes.
 * Use this when you need to check if a token has changed without
 * comparing raw values (e.g., deduplication, audit logs).
 *
 * Do NOT use the hash as a replacement for the raw token when
 * sending push notifications — Expo requires the original token.
 */
export function hashPushToken(token: string): string {
  if (!salt && process.env.NODE_ENV === 'production') {
    throw new Error('PUSH_TOKEN_SALT is required in production');
  }
  return createHmac('sha256', salt ?? 'dev-salt').update(token).digest('hex');
}
