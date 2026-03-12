import { createHmac } from 'node:crypto';

/** One-way hash of userId to prevent sending raw UUIDs to third-party services. */
export function pseudonymizeUserId(userId: string): string {
  const salt = process.env.ANALYTICS_HASH_SALT ?? 'pawmeet-default-salt';
  return createHmac('sha256', salt).update(userId).digest('hex').slice(0, 32);
}
