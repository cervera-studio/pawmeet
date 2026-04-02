import { SWIPE_DAILY_LIMIT } from '@pawmeet/config';
import { describe, expect, it, vi } from 'vitest';
import type { MatchRepository } from '../ports/index.js';
import { checkDailySwipeLimit } from './swipe-limit.js';

function createMockMatchRepo(dailyCount: number): MatchRepository {
  return {
    countDailySwipes: vi.fn().mockResolvedValue(dailyCount),
  } as unknown as MatchRepository;
}

describe('swipe-limit', () => {
  describe('checkDailySwipeLimit', () => {
    it('returns null when under the daily limit', async () => {
      const repo = createMockMatchRepo(0);
      const result = await checkDailySwipeLimit(repo, 'dog-1');
      expect(result).toBeNull();
    });

    it('returns null when one below the limit', async () => {
      const repo = createMockMatchRepo(SWIPE_DAILY_LIMIT - 1);
      const result = await checkDailySwipeLimit(repo, 'dog-1');
      expect(result).toBeNull();
    });

    it('returns a fail Result when at the daily limit', async () => {
      const repo = createMockMatchRepo(SWIPE_DAILY_LIMIT);
      const result = await checkDailySwipeLimit(repo, 'dog-1');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result && !result.success) {
        expect(result.error.code).toBe('SWIPE_LIMIT_REACHED');
        expect(result.error.status).toBe(429);
      }
    });

    it('returns a fail Result when over the daily limit', async () => {
      const repo = createMockMatchRepo(SWIPE_DAILY_LIMIT + 10);
      const result = await checkDailySwipeLimit(repo, 'dog-1');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
    });

    it('passes the correct start-of-day date to repository', async () => {
      const repo = createMockMatchRepo(0);
      await checkDailySwipeLimit(repo, 'dog-1');

      const call = vi.mocked(repo.countDailySwipes).mock.calls[0];
      expect(call?.[0]).toBe('dog-1');

      const dateArg = call?.[1] as Date;
      expect(dateArg.getHours()).toBe(0);
      expect(dateArg.getMinutes()).toBe(0);
      expect(dateArg.getSeconds()).toBe(0);
      expect(dateArg.getMilliseconds()).toBe(0);
    });
  });
});
