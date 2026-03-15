import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { canTransitionTo } from '../domain/group-event-state-machine.js';
import type { BadgeRepository } from '../ports/badge-repository.js';
import type {
  GroupEventRepository,
  GroupEventTransitionQueries,
  NotificationService,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants' | 'updateStatus'> &
    GroupEventTransitionQueries;
  notificationService: NotificationService;
  badgeRepo: BadgeRepository;
};

export function createTransitionEventStatuses({
  groupEventRepo,
  notificationService,
  badgeRepo,
}: Deps) {
  return async (): Promise<Result<{ startedCount: number; completedCount: number }>> => {
    let startedCount = 0;
    let completedCount = 0;

    // Transition: scheduled → in_progress
    const toStart = await groupEventRepo.findScheduledPastStart();
    for (const event of toStart) {
      if (!canTransitionTo(event.status, 'in_progress')) {
        logger.warn(
          'transitionEventStatuses',
          `Skipping event ${event.id}: cannot transition from "${event.status}" to "in_progress"`,
        );
        continue;
      }
      await groupEventRepo.updateStatus(event.id, 'in_progress');
      startedCount++;

      logger.info('transitionEventStatuses', `Event ${event.id} started: ${event.title}`);
    }

    // Transition: in_progress → completed
    const toComplete = await groupEventRepo.findInProgressPastEnd();
    for (const event of toComplete) {
      if (!canTransitionTo(event.status, 'completed')) {
        logger.warn(
          'transitionEventStatuses',
          `Skipping event ${event.id}: cannot transition from "${event.status}" to "completed"`,
        );
        continue;
      }
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

        // Award Main Event badge to participants of official events
        if (event.isOfficial) {
          for (const p of accepted) {
            const hasBadge = await badgeRepo.hasBadge(p.dogId, 'main_event');
            if (!hasBadge) {
              await badgeRepo.award(p.dogId, 'main_event');
              logger.info('transitionEventStatuses', `Awarded main_event badge to dog ${p.dogId}`);
            }
          }
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

    return succeed({ startedCount, completedCount });
  };
}
