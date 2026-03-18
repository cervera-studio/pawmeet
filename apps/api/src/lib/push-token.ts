/**
 * Push token utilities.
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
