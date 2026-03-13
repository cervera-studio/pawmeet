import { createHmac } from 'node:crypto';

/** One-way hash of userId to prevent sending raw UUIDs to third-party services. */
export function pseudonymizeUserId(userId: string): string {
  const salt = process.env.ANALYTICS_HASH_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ANALYTICS_HASH_SALT environment variable is required in production');
    }
    return createHmac('sha256', 'pawmeet-default-salt')
      .update(userId)
      .digest('hex')
      .slice(0, 32);
  }
  return createHmac('sha256', salt).update(userId).digest('hex').slice(0, 32);
}
