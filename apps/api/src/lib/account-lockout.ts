import { logger } from '@dogwalk/utils';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes
const FAILED_ATTEMPTS_PREFIX = 'auth:failed:';

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
        const key = `${FAILED_ATTEMPTS_PREFIX}${userId}`;
        const attempts = await redis.incr(key);
        // Set/refresh TTL on every attempt
        await redis.expire(key, LOCKOUT_DURATION_SECONDS);
        return attempts;
      } catch (err) {
        logger.warn('AccountLockout', 'Failed to record attempt, allowing login', err);
        return 0;
      }
    },

    async isLocked(userId: string): Promise<boolean> {
      try {
        const redis = await getRedis();
        const key = `${FAILED_ATTEMPTS_PREFIX}${userId}`;
        const attempts = await redis.get<number>(key);
        return (attempts ?? 0) >= MAX_FAILED_ATTEMPTS;
      } catch (err) {
        // Fail-open: if Redis is unavailable, don't lock anyone out
        logger.warn('AccountLockout', 'Failed to check lock status, allowing login', err);
        return false;
      }
    },

    async resetAttempts(userId: string): Promise<void> {
      try {
        const redis = await getRedis();
        await redis.del(`${FAILED_ATTEMPTS_PREFIX}${userId}`);
      } catch (err) {
        logger.warn('AccountLockout', 'Failed to reset attempts', err);
      }
    },
  };
}

export const accountLockout = createAccountLockout();
export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_SECONDS };
