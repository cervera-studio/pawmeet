import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { NOTIF_TOXICITY_WARNING } from '../constants/notifications.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { ToxicityDetectionService } from '../ports/toxicity-detection-service.js';
import type { CommentToxicityJobData, MessageToxicityJobData } from './queue.js';
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

  const worker = new Worker<MessageToxicityJobData | CommentToxicityJobData>(
    QUEUE_NAMES.MESSAGE_TOXICITY,
    async (job) => {
      const isComment = job.name === 'check-comment';
      const senderId = isComment
        ? (job.data as CommentToxicityJobData).authorId
        : (job.data as MessageToxicityJobData).senderId;
      const content = job.data.content;
      const itemId = isComment
        ? (job.data as CommentToxicityJobData).commentId
        : (job.data as MessageToxicityJobData).messageId;

      if (!content.trim()) return;

      logger.info('MessageToxicity', `Checking ${isComment ? 'comment' : 'message'} ${itemId}`);

      const result = await toxicityService.analyzeText(content, 'it');

      if (result.toxic) {
        logger.warn(
          'MessageToxicity',
          `Toxic ${isComment ? 'comment' : 'message'} detected (${itemId}): toxicity=${result.scores.toxicity.toFixed(2)}, severe=${result.scores.severeToxicity.toFixed(2)}`,
        );

        const warningBody = isComment
          ? NOTIF_TOXICITY_WARNING.commentBody
          : NOTIF_TOXICITY_WARNING.messageBody;

        // Warn the sender
        await notificationService
          .send({
            userId: senderId,
            title: NOTIF_TOXICITY_WARNING.title,
            body: warningBody,
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
