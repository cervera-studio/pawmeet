import { redis } from './redis.js';

const PRESENCE_TTL_SECONDS = 5 * 60; // 5 minutes
const PRESENCE_KEY_PREFIX = 'user:active:';

/**
 * Dedup window: only refresh the Redis presence key at most once per userId
 * within this interval. A user making 100 API calls in 60s produces 1 Redis
 * write, not 100. TTL in Redis is 5min so refreshing every ~60s is sufficient
 * to keep them marked active.
 */
const LOCAL_DEDUP_MS = 60 * 1000;
const lastWriteByUser = new Map<string, number>();

/** Mark a user as active (call on any API interaction). */
export async function markUserActive(userId: string): Promise<void> {
  const now = Date.now();
  const last = lastWriteByUser.get(userId) ?? 0;
  if (now - last < LOCAL_DEDUP_MS) return;
  lastWriteByUser.set(userId, now);

  // Opportunistic GC to prevent map growth in long-lived processes
  if (lastWriteByUser.size > 10_000) {
    const cutoff = now - LOCAL_DEDUP_MS;
    for (const [uid, ts] of lastWriteByUser) {
      if (ts < cutoff) lastWriteByUser.delete(uid);
    }
  }

  await redis.set(`${PRESENCE_KEY_PREFIX}${userId}`, now.toString(), {
    ex: PRESENCE_TTL_SECONDS,
  });
}

/** Check if a specific user is currently active. */
export async function isUserActive(userId: string): Promise<boolean> {
  const result = await redis.exists(`${PRESENCE_KEY_PREFIX}${userId}`);
  return result === 1;
}

/** Count how many of the given userIds are currently active. */
export async function countActiveUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.exists(`${PRESENCE_KEY_PREFIX}${id}`);
  }
  const results = await pipeline.exec();
  return (results as number[]).filter((r) => r === 1).length;
}

/** Get active status for multiple users. Returns Map<userId, isActive>. */
export async function getActiveStatuses(userIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (userIds.length === 0) return map;
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.exists(`${PRESENCE_KEY_PREFIX}${id}`);
  }
  const results = await pipeline.exec();
  for (const [i, uid] of userIds.entries()) {
    map.set(uid, (results as number[])[i] === 1);
  }
  return map;
}
