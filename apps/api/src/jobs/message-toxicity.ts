import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { NotificationService } from '../ports/notification-service.js';
import type { ToxicityDetectionService } from '../ports/toxicity-detection-service.js';
import type { MessageToxicityJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface MessageToxicityDeps {
  toxicityService: ToxicityDetectionService;
  notificationService: NotificationService;
}

/**
 * Async worker that checks messages for toxic content via Perspective API.
 * Messages are delivered immediately — toxicity detection runs post-hoc.
 * If toxic content is detected, the sender is warned via push notification.
 */
export function createMessageToxicityWorker(deps: MessageToxicityDeps) {
  const { toxicityService, notificationService } = deps;

  const worker = new Worker<MessageToxicityJobData>(
    QUEUE_NAMES.MESSAGE_TOXICITY,
    async (job) => {
      const { messageId, senderId, content } = job.data;

      if (!content.trim()) return;

      logger.info('MessageToxicity', `Checking message ${messageId}`);

      const result = await toxicityService.analyzeText(content, 'it');

      if (result.toxic) {
        logger.warn(
          'MessageToxicity',
          `Toxic message detected (${messageId}): toxicity=${result.scores.toxicity.toFixed(2)}, severe=${result.scores.severeToxicity.toFixed(2)}`,
        );

        // Warn the sender
        await notificationService
          .send({
            userId: senderId,
            title: 'Avviso',
            body: 'Il tuo messaggio potrebbe contenere linguaggio inappropriato. Ti chiediamo di mantenere un tono rispettoso.',
          })
          .catch((err) => {
            logger.error('MessageToxicity', 'Failed to send notification', err);
          });
      }
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  worker.on('completed', (job) => {
    logger.info('MessageToxicity', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('MessageToxicity', `Job ${job?.id} failed`, err);
  });

  return worker;
}
