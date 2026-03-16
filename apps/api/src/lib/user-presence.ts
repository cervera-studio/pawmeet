import { redis } from './redis.js';

const PRESENCE_TTL_SECONDS = 5 * 60; // 5 minutes
const PRESENCE_KEY_PREFIX = 'user:active:';

/** Mark a user as active (call on any API interaction). */
export async function markUserActive(userId: string): Promise<void> {
  await redis.set(`${PRESENCE_KEY_PREFIX}${userId}`, Date.now().toString(), {
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
