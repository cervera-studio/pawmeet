import { GROUP_EVENT_OCCURRENCES_AHEAD } from '@pawmeet/config';
import { GROUP_EVENT_STATUS } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { RRule } from 'rrule';
import type { GroupEventRecurrenceRepository, GroupEventRepository } from '../ports/index.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'create' | 'updateStatus'> &
    GroupEventRecurrenceRepository;
};

export function createRecurringEventWorker(deps: Deps): Worker {
  const worker = new Worker(
    QUEUE_NAMES.RECURRING_EVENT,
    async () => {
      await generateOccurrences(deps);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', () => {
    logger.info('RecurringEvent', 'Occurrence generation completed');
  });
  worker.on('failed', (_job, err) => {
    logger.error('RecurringEvent', 'Occurrence generation failed', err.message);
  });

  return worker;
}

async function generateOccurrences({ groupEventRepo }: Deps): Promise<void> {
  const templates = await groupEventRepo.findTemplates();
  const now = new Date();

  for (const template of templates) {
    // If recurrenceEnd has passed, complete the template
    if (template.recurrenceEnd && template.recurrenceEnd <= now) {
      await groupEventRepo.updateStatus(template.id, GROUP_EVENT_STATUS.COMPLETED);
      logger.info('RecurringEvent', `Template ${template.id} completed (recurrenceEnd passed)`);
      continue;
    }

    if (!template.recurrenceRule) continue;

    // Count future occurrences
    const occurrences = await groupEventRepo.findOccurrences(template.id);
    const futureOccurrences = occurrences.filter((o) => o.scheduledAt > now);

    if (futureOccurrences.length >= GROUP_EVENT_OCCURRENCES_AHEAD) {
      continue;
    }

    const needed = GROUP_EVENT_OCCURRENCES_AHEAD - futureOccurrences.length;

    // Determine start date for new occurrences
    const lastOccurrence = occurrences.length > 0 ? (occurrences.at(-1)?.scheduledAt ?? now) : now;

    const afterDate = new Date(Math.max(lastOccurrence.getTime(), now.getTime()));

    try {
      const rrule = RRule.fromString(template.recurrenceRule);
      const endLimit =
        template.recurrenceEnd ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const dates = rrule.between(afterDate, endLimit, false);
      const newDates = dates.slice(0, needed);

      for (const date of newDates) {
        const occurrenceDate = new Date(date);
        occurrenceDate.setUTCHours(
          template.scheduledAt.getUTCHours(),
          template.scheduledAt.getUTCMinutes(),
          0,
          0,
        );

        await groupEventRepo.create({
          createdBy: template.createdBy,
          title: template.title,
          description: template.description,
          scheduledAt: occurrenceDate,
          durationMin: template.durationMin,
          location: template.location,
          latitude: template.latitude,
          longitude: template.longitude,
          maxParticipants: template.maxParticipants,
          visibility: template.visibility,
          category: template.category,
          requiresApproval: template.requiresApproval,
          parentEventId: template.id,
          coverImageUrl: template.coverImageUrl,
        });
      }

      if (newDates.length > 0) {
        logger.info(
          'RecurringEvent',
          `Generated ${newDates.length} occurrences for template ${template.id}`,
        );
      }
    } catch (err) {
      logger.error('RecurringEvent', `Failed to parse RRULE for template ${template.id}`, err);
    }
  }
}

/** Schedule the recurring event generation job (daily at 03:00 UTC) */
export async function scheduleRecurringEventGeneration() {
  const { Queue } = await import('bullmq');
  const queue = new Queue(QUEUE_NAMES.RECURRING_EVENT, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  });
  await queue.upsertJobScheduler(
    'daily-recurring-event-generation',
    { pattern: '0 3 * * *' },
    { name: 'generate' },
  );
}
