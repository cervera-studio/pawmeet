import { logger } from '@pawmeet/utils';
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

      // Notify all accepted participants that the event has ended
      const full = await groupEventRepo.findByIdWithParticipants(event.id);
      if (full) {
        const accepted = full.participants.filter((p) => p.status === 'accepted');
        for (const p of accepted) {
          await notificationService.send({
            userId: p.userId,
            title: 'Evento completato',
            body: `"${event.title}" è terminato. Com'è andata?`,
            data: { type: 'event_completed', eventId: event.id },
          });
        }
      }

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
