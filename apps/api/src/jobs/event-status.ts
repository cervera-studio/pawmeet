import { Worker } from 'bullmq';
import type { BadgeRepository } from '../ports/badge-repository.js';
import type {
  GroupEventRepository,
  GroupEventTransitionQueries,
  NotificationService,
} from '../ports/index.js';
import { createTransitionEventStatuses } from '../use-cases/transition-event-statuses.js';
import { getEventStatusQueue, getRedisConnection, QUEUE_NAMES } from './queue.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants' | 'updateStatus'> &
    GroupEventTransitionQueries;
  notificationService: NotificationService;
  badgeRepo: BadgeRepository;
};

export function createEventStatusWorker(deps: Deps): Worker {
  const transitionStatuses = createTransitionEventStatuses(deps);

  const worker = new Worker(
    QUEUE_NAMES.EVENT_STATUS,
    async () => {
      const result = await transitionStatuses();
      if (!result.success) {
        throw result.error;
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (_job) => {
    console.log('[event-status] Status check completed');
  });
  worker.on('failed', (_job, err) => {
    console.error('[event-status] Status check failed:', err.message);
  });

  return worker;
}

/** Schedule the repeatable status check job (every 5 minutes) */
export async function scheduleEventStatusCheck() {
  const queue = getEventStatusQueue();
  await queue.add('check-statuses', {}, { repeat: { every: 5 * 60 * 1000 } });
}
