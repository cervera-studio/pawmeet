import { logger } from '@pawmeet/utils';
import {
  MAX_OTP_ATTEMPTS,
  OTP_WINDOW_SECONDS,
  REDIS_PREFIX_OTP_ATTEMPTS,
} from '../constants/auth.js';

async function getRedis() {
  const { redis } = await import('./redis.js');
  return redis;
}

/**
 * Per-email OTP attempt rate limiting.
 * Prevents brute-force of 8-digit OTP codes by limiting to 5 attempts
 * per email per 15-minute window, regardless of source IP.
 */
export async function checkOtpRateLimit(email: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    const key = `${REDIS_PREFIX_OTP_ATTEMPTS}${email.toLowerCase()}`;
    const attempts = await redis.get<number>(key);
    return (attempts ?? 0) < MAX_OTP_ATTEMPTS;
  } catch (err) {
    // Fail-closed: deny OTP verification when Redis is unavailable
    logger.error('OtpRateLimit', 'Redis unavailable, denying OTP verification (fail-closed)', err);
    return false;
  }
}

export async function recordOtpAttempt(email: string): Promise<void> {
  try {
    const redis = await getRedis();
    const key = `${REDIS_PREFIX_OTP_ATTEMPTS}${email.toLowerCase()}`;
    await redis.incr(key);
    await redis.expire(key, OTP_WINDOW_SECONDS);
  } catch (err) {
    logger.error('OtpRateLimit', 'Failed to record OTP attempt', err);
  }
}

export async function resetOtpAttempts(email: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`${REDIS_PREFIX_OTP_ATTEMPTS}${email.toLowerCase()}`);
  } catch (err) {
    logger.warn('OtpRateLimit', 'Failed to reset OTP attempts', err);
  }
}
