import { logger } from '@pawmeet/utils';
import {
  MAX_FAILED_ATTEMPTS,
  REDIS_PREFIX_USER_FAILED_ATTEMPTS,
  USER_LOCKOUT_DURATION_SECONDS,
} from '../constants/auth.js';

interface AccountLockoutService {
  recordFailedAttempt(userId: string): Promise<number>;
  isLocked(userId: string): Promise<boolean>;
  resetAttempts(userId: string): Promise<void>;
}

async function getRedis() {
  const { redis } = await import('./redis.js');
  return redis;
}

export function createAccountLockout(): AccountLockoutService {
  return {
    async recordFailedAttempt(userId: string): Promise<number> {
      try {
        const redis = await getRedis();
        const key = `${REDIS_PREFIX_USER_FAILED_ATTEMPTS}${userId}`;
        const attempts = await redis.incr(key);
        // Set/refresh TTL on every attempt
        await redis.expire(key, USER_LOCKOUT_DURATION_SECONDS);
        return attempts;
      } catch (err) {
        // Fail-closed: treat as max attempts to prevent brute-force when Redis is down
        logger.error('AccountLockout', 'Redis unavailable, treating as locked (fail-closed)', err);
        return MAX_FAILED_ATTEMPTS;
      }
    },

    async isLocked(userId: string): Promise<boolean> {
      try {
        const redis = await getRedis();
        const key = `${REDIS_PREFIX_USER_FAILED_ATTEMPTS}${userId}`;
        const attempts = await redis.get<number>(key);
        return (attempts ?? 0) >= MAX_FAILED_ATTEMPTS;
      } catch (err) {
        // Fail-closed: if Redis is unavailable, deny login to prevent brute-force
        logger.error('AccountLockout', 'Redis unavailable, denying login (fail-closed)', err);
        return true;
      }
    },

    async resetAttempts(userId: string): Promise<void> {
      try {
        const redis = await getRedis();
        await redis.del(`${REDIS_PREFIX_USER_FAILED_ATTEMPTS}${userId}`);
      } catch (err) {
        logger.warn('AccountLockout', 'Failed to reset attempts', err);
      }
    },
  };
}

export const accountLockout = createAccountLockout();
