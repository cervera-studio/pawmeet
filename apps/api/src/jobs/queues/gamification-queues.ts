import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getWeeklyChallengesQueue = createLazyQueue('weekly-challenges', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getStreakCheckQueue = createLazyQueue('streak-check', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getRisingCompatibilityQueue = createLazyQueue('rising-compatibility', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

// --- Schedule helpers ---

/** Schedule weekly challenge rotation every Monday at 00:00 UTC. */
export async function scheduleWeeklyChallenges() {
  const queue = getWeeklyChallengesQueue();
  await queue.upsertJobScheduler(
    'weekly-challenge-rotation',
    { pattern: '0 0 * * 1' },
    { name: 'rotate' },
  );
}

/** Schedule daily streak break check at 01:00 UTC. */
export async function scheduleStreakCheck() {
  const queue = getStreakCheckQueue();
  await queue.upsertJobScheduler('daily-streak-check', { pattern: '0 1 * * *' }, { name: 'check' });
}

/** Schedule daily rising compatibility detection at 05:00 UTC. */
export async function scheduleRisingCompatibility() {
  const queue = getRisingCompatibilityQueue();
  await queue.upsertJobScheduler(
    'daily-rising-compatibility',
    { pattern: '0 5 * * *' },
    { name: 'detect' },
  );
}
