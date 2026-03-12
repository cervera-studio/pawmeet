import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { Worker } from 'bullmq';
import { extractKeyFromUrl, MAX_FILE_SIZE, MAX_VIDEO_FILE_SIZE } from '../lib/storage.js';
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

async function moderateMedia(
  url: string,
  mediaType: 'photo' | 'video',
): Promise<'approved' | 'rejected'> {
  let mediaMeta: { exists: boolean; contentLength: number };
  try {
    mediaMeta = await verifyMediaInR2(url);
  } catch {
    console.error(`[content-moderation] Media not found in R2: ${url}`);
    return 'rejected';
  }

  const maxSize = mediaType === 'video' ? MAX_VIDEO_FILE_SIZE : MAX_FILE_SIZE;
  if (mediaMeta.contentLength > maxSize) {
    console.warn(
      `[content-moderation] Media exceeds size limit (${mediaMeta.contentLength} bytes): ${url}`,
    );
    return 'rejected';
  }

  if (mediaMeta.contentLength === 0) {
    console.warn(`[content-moderation] Media has zero bytes: ${url}`);
    return 'rejected';
  }

  // TODO: Integrate real content moderation API (AWS Rekognition, Google Vision, etc.)
  console.warn(
    '[content-moderation] WARNING: No content moderation service configured. ' +
      'Media auto-approved without content analysis.',
  );
  return 'approved';
}

interface ContentModerationDeps {
  feedRepo: FeedRepository;
  notificationService: NotificationService;
}

export function createContentModerationWorker(deps: ContentModerationDeps) {
  const { feedRepo, notificationService } = deps;

  const worker = new Worker<ContentModerationJobData>(
    QUEUE_NAMES.CONTENT_MODERATION,
    async (job) => {
      const { mediaId, postId, url, mediaType } = job.data;
      console.log(`[content-moderation] Processing ${mediaType} ${mediaId}: ${url}`);

      const status = await moderateMedia(url, mediaType);

      await feedRepo.updateMediaModerationStatus(mediaId, status);

      // If all media for this post are approved, approve the post
      if (status === 'approved') {
        const allMedia = await feedRepo.findMediaByPost(postId);
        const allApproved = allMedia.every((m) => m.moderationStatus === 'approved');
        if (allApproved) {
          const post = await feedRepo.findPostById(postId);
          if (post && post.moderationStatus === 'pending') {
            // Directly update post status
            // (In a full implementation, the repo would have an updateModerationStatus method)
          }
        }
      }

      if (status === 'rejected') {
        const post = await feedRepo.findPostById(postId);
        if (post) {
          await notificationService
            .send({
              userId: post.authorId,
              title: 'Contenuto rifiutato',
              body: 'Uno dei tuoi contenuti non rispetta le linee guida.',
            })
            .catch((err) => {
              console.error(`[content-moderation] Failed to send notification:`, err);
            });
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`[content-moderation] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[content-moderation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
