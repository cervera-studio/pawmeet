import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { MlTrainingRepository } from '../ports/ml-training-repository.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

interface MlTrainingLabelsDeps {
  mlTrainingRepo: MlTrainingRepository;
}

/**
 * BullMQ worker that materializes ML training labels for mature matches (>7 days old).
 * Scheduled daily at 01:00 UTC via repeatable job.
 *
 * Outcome label formula (0.0–1.0):
 *   +0.15 if first message sent
 *   +0.15 if reply within 24h
 *   +0.20 if walk proposed
 *   +0.30 if walk completed
 *   +0.20 × (avg_feedback_rating / 5) if feedback exists
 *   -0.30 if unmatched within 7 days
 *
 * Idempotent: skips matches that already have a row in ml_training_samples.
 */
export function createMlTrainingLabelsWorker(deps: MlTrainingLabelsDeps) {
  const { mlTrainingRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.ML_TRAINING_LABELS,
    async () => {
      logger.info('ml-training-labels', 'Starting training label materialization');

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const rows = await mlTrainingRepo.findMatureMatchesForLabeling(cutoff);

      if (rows.length === 0) {
        logger.info('ml-training-labels', 'No new mature matches to process');
        return;
      }

      const now = new Date();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const samples = rows.map((row) => {
        // Compute outcome label
        let label = 0.0;

        if (row.has_first_message) label += 0.15;
        if (row.has_reply_within_24h) label += 0.15;
        if (row.has_walk_proposed) label += 0.2;
        if (row.has_walk_completed) label += 0.3;

        if (row.avg_feedback_rating != null) {
          label += 0.2 * (row.avg_feedback_rating / 5);
        }

        // Penalty: unmatched within 7 days
        const matchAge = now.getTime() - new Date(row.match_created_at).getTime();
        if (!row.is_active && matchAge < sevenDaysMs) {
          label -= 0.3;
        }

        // Clamp to valid range
        label = Math.max(-0.3, Math.min(1.0, label));

        // Build feature vector from swipe score logs + match compatibility
        const featureVector = {
          compatibilityScore: row.compatibility_score,
          sizeScore: row.size_score ?? null,
          energyScore: row.energy_score ?? null,
          behaviorScore: row.behavior_score ?? null,
          walkScore: row.walk_score ?? null,
          distanceScore: row.distance_score ?? null,
          leashScore: row.leash_score ?? null,
          overallScore: row.overall_score ?? null,
        };

        return {
          matchId: row.match_id,
          dogAId: row.dog_a_id,
          dogBId: row.dog_b_id,
          featureVector,
          outcomeLabel: Math.round(label * 1000) / 1000,
          labelVersion: 1,
          maturedAt: cutoff,
        };
      });

      // Batch insert
      await mlTrainingRepo.insertTrainingSamples(samples);

      logger.info('ml-training-labels', `Materialized ${samples.length} training labels`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('ml-training-labels', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ml-training-labels', `Job ${job?.id} failed: ${err.message}`);

    // Move to DLQ after all retries exhausted
    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('ml-training-labels', job.data, err.message).catch((dlqErr) => {
        logger.error('ml-training-labels', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
