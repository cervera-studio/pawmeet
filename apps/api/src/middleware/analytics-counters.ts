import type { MiddlewareHandler } from 'hono';
import { redis } from '../lib/redis.js';

const DAY_SECONDS = 86_400;
const TTL_DAYS = 90;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Hono middleware that tracks DAU via Redis HyperLogLog.
 *
 * Redis is used ONLY for real-time DAU (HyperLogLog) — all other analytics
 * counters live in Postgres (analytics_events → analytics_daily_metrics).
 *
 * Counters auto-expire after 90 days. Runs fire-and-forget (never blocks response).
 */
export const analyticsCountersMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  // Fire-and-forget — do not await to avoid blocking the response
  const userId = c.get('userId') as string | undefined;
  if (userId) {
    const day = todayKey();
    const dauKey = `analytics:dau:${day}`;

    redis
      .pipeline()
      .pfadd(dauKey, userId)
      .expire(dauKey, DAY_SECONDS * TTL_DAYS)
      .exec()
      .catch(() => {
        // Silently ignore Redis counter failures — non-critical
      });
  }
};

/** Read DAU count for a given date (YYYY-MM-DD). */
export async function getDauCount(date: string): Promise<number> {
  return redis.pfcount(`analytics:dau:${date}`);
}

/** Read DAU counts for the last N days using a single Redis pipeline. */
export async function getDauTimeSeries(
  days: number,
): Promise<Array<{ date: string; count: number }>> {
  const dates: string[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Single pipeline instead of N sequential calls
  const pipeline = redis.pipeline();
  for (const date of dates) {
    pipeline.pfcount(`analytics:dau:${date}`);
  }
  const results = await pipeline.exec();

  return dates.map((date, i) => ({
    date,
    count: (results[i] as number) ?? 0,
  }));
}
