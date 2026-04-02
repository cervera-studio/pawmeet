import type { GroupEventStatus, Result } from '@pawmeet/types';
import { PARTICIPANT_STATUS, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { NOTIF_EVENT_COMPLETED } from '../constants/notifications.js';
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

type EventWithStatus = {
  id: string;
  status: GroupEventStatus;
  title: string;
  isOfficial?: boolean;
};
type AcceptedParticipant = { userId: string; dogId: string; status: string };

async function transitionToStarted(
  groupEventRepo: Deps['groupEventRepo'],
  events: EventWithStatus[],
): Promise<number> {
  let count = 0;
  for (const event of events) {
    if (!canTransitionTo(event.status, 'in_progress')) {
      logger.warn(
        'transitionEventStatuses',
        `Skipping event ${event.id}: cannot transition from "${event.status}" to "in_progress"`,
      );
      continue;
    }
    await groupEventRepo.updateStatus(event.id, 'in_progress');
    count++;
    logger.info('transitionEventStatuses', `Event ${event.id} started: ${event.title}`);
  }
  return count;
}

async function notifyCompletedParticipants(
  notificationService: NotificationService,
  participants: AcceptedParticipant[],
  event: EventWithStatus,
): Promise<void> {
  for (const p of participants) {
    await notificationService.send({
      userId: p.userId,
      title: NOTIF_EVENT_COMPLETED.title,
      body: NOTIF_EVENT_COMPLETED.body(event.title),
      data: { type: 'event_completed', eventId: event.id },
    });
  }
}

async function awardOfficialEventBadges(
  badgeRepo: BadgeRepository,
  participants: AcceptedParticipant[],
): Promise<void> {
  for (const p of participants) {
    const hasBadge = await badgeRepo.hasBadge(p.dogId, 'main_event');
    if (!hasBadge) {
      await badgeRepo.award(p.dogId, 'main_event');
      logger.info('transitionEventStatuses', `Awarded main_event badge to dog ${p.dogId}`);
    }
  }
}

export function createTransitionEventStatuses({
  groupEventRepo,
  notificationService,
  badgeRepo,
}: Deps) {
  return async (): Promise<Result<{ startedCount: number; completedCount: number }>> => {
    const toStart = await groupEventRepo.findScheduledPastStart();
    const startedCount = await transitionToStarted(groupEventRepo, toStart);

    let completedCount = 0;
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

      const full = await groupEventRepo.findByIdWithParticipants(event.id);
      if (full) {
        const accepted = full.participants.filter((p) => p.status === PARTICIPANT_STATUS.ACCEPTED);
        await notifyCompletedParticipants(notificationService, accepted, event);

        if (event.isOfficial) {
          await awardOfficialEventBadges(badgeRepo, accepted);
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
