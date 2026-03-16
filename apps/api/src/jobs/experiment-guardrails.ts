import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { trackEvent } from '../lib/track-event.js';
import type { ExperimentGuardrailsRepository } from '../ports/experiment-guardrails-repository.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

const EXPERIMENT_NAME = 'ai_matching_enabled';
const GUARDRAIL_LOOKBACK_DAYS = 7;

interface VariantMetrics {
  unmatchRate: number;
  feedEmptyRate: number;
  activeUsersPerEnrolled: number;
}

interface GuardrailResult {
  metric: string;
  treatmentValue: number;
  controlValue: number;
  breached: boolean;
}

interface ExperimentGuardrailsDeps {
  experimentGuardrailsRepo: ExperimentGuardrailsRepository;
}

/**
 * BullMQ worker that checks A/B experiment guardrail metrics daily at 04:30 UTC.
 *
 * Guardrails:
 * - Unmatch rate: treatment > control +20% relative → kill
 * - D7 retention proxy: treatment < control -10% relative → kill
 * - Feed empty rate: treatment >= 2x control → kill
 *
 * When any guardrail is breached, sets `experiment:{name}:kill` in Redis
 * and tracks an `experiment_auto_stopped` event.
 */
export function createExperimentGuardrailsWorker(deps: ExperimentGuardrailsDeps) {
  const { experimentGuardrailsRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.EXPERIMENT_GUARDRAILS,
    async () => {
      const killKey = `experiment:${EXPERIMENT_NAME}:kill`;
      const isKilled = await redis.get(killKey);
      if (isKilled === '1') {
        logger.info('experiment-guardrails', 'Experiment already killed, skipping');
        return;
      }

      const now = new Date();
      const dayStart = new Date(now.getTime() - GUARDRAIL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const nextDayStart = now;

      // Unmatch rate per variant: match_unmatched / match_created
      const unmatchRows = await experimentGuardrailsRepo.getVariantUnmatchRates({
        dayStart,
        nextDayStart,
      });

      // Feed empty rate per variant: match_feed_exhausted / match_feed_loaded
      const feedRows = await experimentGuardrailsRepo.getVariantFeedEmptyRates({
        dayStart,
        nextDayStart,
      });

      // D7 retention proxy: unique active users (app_opened) / unique enrolled users per variant
      const retentionRows = await experimentGuardrailsRepo.getVariantRetentionRates({
        dayStart,
        nextDayStart,
      });

      // Build per-variant metrics
      const metrics = new Map<string, VariantMetrics>();
      for (const variant of ['control', 'treatment']) {
        const unmatch = unmatchRows.find((r) => r.variant === variant);
        const feed = feedRows.find((r) => r.variant === variant);
        const retention = retentionRows.find((r) => r.variant === variant);

        const creates = Number(unmatch?.creates ?? 0);
        const loaded = Number(feed?.loaded ?? 0);
        const enrolled = Number(retention?.enrolled_users ?? 0);

        metrics.set(variant, {
          unmatchRate: creates > 0 ? Number(unmatch?.unmatches ?? 0) / creates : 0,
          feedEmptyRate: loaded > 0 ? Number(feed?.exhausted ?? 0) / loaded : 0,
          activeUsersPerEnrolled:
            enrolled > 0 ? Number(retention?.active_users ?? 0) / enrolled : 0,
        });
      }

      const control = metrics.get('control');
      const treatment = metrics.get('treatment');

      if (!control || !treatment) {
        logger.info('experiment-guardrails', 'Missing variant data, skipping guardrail check');
        return;
      }

      // Evaluate guardrails
      const guardrails: GuardrailResult[] = [
        {
          metric: 'unmatch_rate',
          treatmentValue: treatment.unmatchRate,
          controlValue: control.unmatchRate,
          breached: control.unmatchRate > 0 && treatment.unmatchRate > control.unmatchRate * 1.2,
        },
        {
          metric: 'd7_retention_proxy',
          treatmentValue: treatment.activeUsersPerEnrolled,
          controlValue: control.activeUsersPerEnrolled,
          breached:
            control.activeUsersPerEnrolled > 0 &&
            treatment.activeUsersPerEnrolled < control.activeUsersPerEnrolled * 0.9,
        },
        {
          metric: 'feed_empty_rate',
          treatmentValue: treatment.feedEmptyRate,
          controlValue: control.feedEmptyRate,
          breached:
            control.feedEmptyRate > 0 && treatment.feedEmptyRate >= control.feedEmptyRate * 2,
        },
      ];

      const breached = guardrails.find((g) => g.breached);

      if (breached) {
        await redis.set(killKey, '1');

        logger.warn(
          'experiment-guardrails',
          `Guardrail breached: ${breached.metric} (treatment=${breached.treatmentValue.toFixed(4)}, control=${breached.controlValue.toFixed(4)}). Kill switch activated.`,
        );

        trackEvent('experiment_auto_stopped', null, {
          experimentName: EXPERIMENT_NAME,
          reason: 'guardrail_breached',
          metric: breached.metric,
          treatmentValue: breached.treatmentValue,
          controlValue: breached.controlValue,
        });
      } else {
        logger.info(
          'experiment-guardrails',
          `All guardrails passed — unmatch: ${treatment.unmatchRate.toFixed(4)} vs ${control.unmatchRate.toFixed(4)}, retention: ${treatment.activeUsersPerEnrolled.toFixed(4)} vs ${control.activeUsersPerEnrolled.toFixed(4)}, feed_empty: ${treatment.feedEmptyRate.toFixed(4)} vs ${control.feedEmptyRate.toFixed(4)}`,
        );
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('experiment-guardrails', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('experiment-guardrails', `Job ${job?.id} failed: ${err.message}`);

    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('experiment-guardrails', job.data, err.message).catch((dlqErr) => {
        logger.error('experiment-guardrails', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
