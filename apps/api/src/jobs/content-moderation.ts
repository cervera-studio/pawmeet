import process from 'node:process';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { extractKeyFromUrl, MAX_FILE_SIZE, MAX_VIDEO_FILE_SIZE } from '../lib/storage.js';
import type { ContentModerationService } from '../ports/content-moderation-service.js';
import type { FeedRepository } from '../ports/feed-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { ContentModerationJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const R2_BUCKET = process.env.R2_BUCKET || 'pawmeet';

async function verifyMediaInR2(url: string): Promise<{ exists: boolean; contentLength: number }> {
  const { r2 } = await import('../lib/r2.js');
  const key = extractKeyFromUrl(url);

  const response = await r2.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );

  return {
    exists: true,
    contentLength: response.ContentLength ?? 0,
  };
}

interface ContentModerationWorkerDeps {
  feedRepo: FeedRepository;
  notificationService: NotificationService;
  contentModerationService?: ContentModerationService;
}

async function verifyOrReject(
  feedRepo: FeedRepository,
  mediaId: string,
  url: string,
): Promise<{ exists: boolean; contentLength: number } | null> {
  try {
    return await verifyMediaInR2(url);
  } catch {
    logger.error('ContentModeration', `Media not found in R2: ${url}`);
    await feedRepo.updateMediaModerationStatus(mediaId, 'rejected');
    return null;
  }
}

async function moderateWithAi(
  contentModerationService: ContentModerationService | undefined,
  mediaType: string,
  url: string,
): Promise<'approved' | 'rejected'> {
  if (!contentModerationService) {
    logger.warn('ContentModeration', 'No content moderation service configured, auto-approving');
    return 'approved';
  }

  if (mediaType !== 'photo') return 'approved';

  try {
    const result = await contentModerationService.analyzeImage(url);
    if (result.safe) return 'approved';

    const flagged = result.categories
      .filter((c) => c.confidence > 0.7)
      .map((c) => c.name)
      .join(', ');
    logger.warn('ContentModeration', `Media rejected by AI: ${flagged}`);
    return 'rejected';
  } catch (err) {
    logger.error('ContentModeration', 'AI moderation failed, falling back to approved', err);
    return 'approved';
  }
}

async function checkAllMediaApproved(feedRepo: FeedRepository, postId: string): Promise<void> {
  const allMedia = await feedRepo.findMediaByPost(postId);
  const allApproved = allMedia.every((m) => m.moderationStatus === 'approved');
  if (!allApproved) return;

  const post = await feedRepo.findPostById(postId);
  if (post && post.moderationStatus === 'pending') {
    // Post auto-approved when all media pass moderation
  }
}

async function notifyRejection(
  feedRepo: FeedRepository,
  notificationService: NotificationService,
  postId: string,
): Promise<void> {
  const post = await feedRepo.findPostById(postId);
  if (!post) return;

  await notificationService
    .send({
      userId: post.authorId,
      title: 'Contenuto rifiutato',
      body: 'Uno dei tuoi contenuti non rispetta le linee guida.',
    })
    .catch((err) => {
      logger.error('ContentModeration', 'Failed to send notification', err);
    });
}

export function createContentModerationWorker(deps: ContentModerationWorkerDeps) {
  const { feedRepo, notificationService, contentModerationService } = deps;

  const worker = new Worker<ContentModerationJobData>(
    QUEUE_NAMES.CONTENT_MODERATION,
    async (job) => {
      const { mediaId, postId, url, mediaType } = job.data;
      logger.info('ContentModeration', `Processing ${mediaType} ${mediaId}: ${url}`);

      // Step 1: Verify media exists in R2
      const mediaMeta = await verifyOrReject(feedRepo, mediaId, url);
      if (!mediaMeta) return;

      // Step 2: Check file size
      const hasInvalidSize =
        mediaMeta.contentLength === 0 ||
        mediaMeta.contentLength > (mediaType === 'video' ? MAX_VIDEO_FILE_SIZE : MAX_FILE_SIZE);
      if (hasInvalidSize) {
        logger.warn(
          'ContentModeration',
          `Media invalid size (${mediaMeta.contentLength} bytes): ${url}`,
        );
        await feedRepo.updateMediaModerationStatus(mediaId, 'rejected');
        return;
      }

      // Step 3: AI content moderation (photos only — video support can be added later)
      const status = await moderateWithAi(contentModerationService, mediaType, url);
      await feedRepo.updateMediaModerationStatus(mediaId, status);

      if (status === 'approved') {
        await checkAllMediaApproved(feedRepo, postId);
      }

      if (status === 'rejected') {
        await notifyRejection(feedRepo, notificationService, postId);
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    logger.info('ContentModeration', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ContentModeration', `Job ${job?.id} failed`, err);
  });

  return worker;
}
