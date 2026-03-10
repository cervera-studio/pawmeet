import { logger } from '@dogwalk/utils';
import type { GroupEventRepository, NotificationService } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  notificationService: NotificationService;
};

export function createTransitionEventStatuses({ groupEventRepo, notificationService }: Deps) {
  return async (): Promise<{ startedCount: number; completedCount: number }> => {
    let startedCount = 0;
    let completedCount = 0;

    // Transition: scheduled → in_progress
    const toStart = await groupEventRepo.findScheduledPastStart();
    for (const event of toStart) {
      await groupEventRepo.updateStatus(event.id, 'in_progress');
      startedCount++;

      logger.info('transitionEventStatuses', `Event ${event.id} started: ${event.title}`);
    }

    // Transition: in_progress → completed
    const toComplete = await groupEventRepo.findInProgressPastEnd();
    for (const event of toComplete) {
      await groupEventRepo.updateStatus(event.id, 'completed');
      completedCount++;

      logger.info('transitionEventStatuses', `Event ${event.id} completed: ${event.title}`);
    }

    if (startedCount > 0 || completedCount > 0) {
      logger.info(
        'transitionEventStatuses',
        `Transitioned ${startedCount} to in_progress, ${completedCount} to completed`,
      );
    }

    return { startedCount, completedCount };
  };
}
