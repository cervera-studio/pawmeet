import { ANALYTICS_MAX_EVENT_AGE_DAYS, ANALYTICS_WORKER_CONCURRENCY } from '@pawmeet/config';
import { CONSENT_TYPE } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { ConsentRepository } from '../infra/drizzle-consent-repository.js';
import { PostHogAnalyticsProvider } from '../infra/posthog-analytics-provider.js';
import type { AnalyticsJobRepository } from '../ports/analytics-job-repository.js';
import type { AnalyticsProvider } from '../ports/analytics-provider.js';
import type { AnalyticsJobData } from './queue.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

interface AnalyticsWorkerDeps {
  providers?: AnalyticsProvider[];
  consentRepo: ConsentRepository;
  analyticsJobRepo: AnalyticsJobRepository;
}

export function createAnalyticsWorker(deps: AnalyticsWorkerDeps): Worker<AnalyticsJobData>;
/**
 * @deprecated Pass `{ providers, consentRepo, analyticsJobRepo }` object instead.
 */
export function createAnalyticsWorker(providers: AnalyticsProvider[]): Worker<AnalyticsJobData>;
export function createAnalyticsWorker(
  depsOrProviders: AnalyticsWorkerDeps | AnalyticsProvider[] = [],
) {
  const providers = Array.isArray(depsOrProviders)
    ? depsOrProviders
    : (depsOrProviders.providers ?? []);
  const consentRepo = Array.isArray(depsOrProviders) ? null : depsOrProviders.consentRepo;
  const analyticsJobRepo = Array.isArray(depsOrProviders) ? null : depsOrProviders.analyticsJobRepo;
  const maxAgeMs = ANALYTICS_MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000;

  const worker = new Worker<AnalyticsJobData>(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      const { events } = job.data;
      const now = Date.now();

      // Filter out events older than max age
      const valid = events.filter((e) => {
        const age = now - new Date(e.clientTimestamp).getTime();
        return age < maxAgeMs && age > -60_000; // Allow 1 min clock skew into future
      });

      if (valid.length === 0) return;

      // Batch insert into Neon (source of truth) with deduplication
      const values = valid.map((e) => ({
        clientEventId: e.clientEventId,
        userId: e.userId,
        sessionId: e.sessionId ?? null,
        eventName: e.eventName,
        properties: e.properties ?? null,
        clientTimestamp: new Date(e.clientTimestamp),
        platform: e.platform,
        appVersion: e.appVersion ?? null,
        screenName: e.screenName ?? null,
        schemaVersion: 1,
      }));

      if (analyticsJobRepo) {
        await analyticsJobRepo.insertEvents(values);
      }

      // Forward to external providers (PostHog, future OpenPanel) — best-effort
      // Only forward events from users who have granted analytics consent
      if (providers.length > 0) {
        let consentedEvents = valid;

        if (consentRepo) {
          // Collect unique user IDs and batch-check analytics consent
          const userIds = [...new Set(valid.map((e) => e.userId).filter(Boolean))] as string[];
          const consentedUserIds = new Set<string>();

          await Promise.all(
            userIds.map(async (uid) => {
              try {
                const consents = await consentRepo.findByUser(uid);
                const analyticsConsent = consents.find(
                  (c) => c.consentType === CONSENT_TYPE.Analytics,
                );
                if (analyticsConsent?.granted) {
                  consentedUserIds.add(uid);
                }
              } catch (err) {
                logger.warn(
                  'analytics',
                  `Consent check failed for ${uid}, skipping provider forward: ${err instanceof Error ? err.message : err}`,
                );
              }
            }),
          );

          consentedEvents = valid.filter((e) => e.userId != null && consentedUserIds.has(e.userId));
        }

        const providerEvents = PostHogAnalyticsProvider.toProviderEvents(consentedEvents);
        if (providerEvents.length > 0) {
          await Promise.allSettled(
            providers.map(async (provider) => {
              try {
                await provider.capture(providerEvents);
              } catch (err) {
                logger.warn(
                  'analytics',
                  `Provider ${provider.name} forward failed: ${err instanceof Error ? err.message : err}`,
                );
              }
            }),
          );
        }
      }

      logger.debug('analytics', `Ingested ${valid.length}/${events.length} events`);
    },
    { connection: getRedisConnection(), concurrency: ANALYTICS_WORKER_CONCURRENCY },
  );

  worker.on('completed', (job) => {
    logger.debug('analytics', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('analytics', `Job ${job?.id} failed: ${err.message}`);

    // Move to DLQ after all retries exhausted
    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('ingest', job.data, err.message).catch((dlqErr) => {
        logger.error('analytics', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
