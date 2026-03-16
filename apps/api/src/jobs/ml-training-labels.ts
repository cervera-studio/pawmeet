import { mlTrainingSamples } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

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
export function createMlTrainingLabelsWorker() {
  const worker = new Worker(
    QUEUE_NAMES.ML_TRAINING_LABELS,
    async () => {
      logger.info('ml-training-labels', 'Starting training label materialization');

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      // Query mature matches with all signals needed for outcome label computation.
      // LEFT JOINs gather chat, walk, and feedback signals per match.
      const result = await db.execute<{
        [key: string]: unknown;
        match_id: string;
        dog_a_id: string;
        dog_b_id: string;
        compatibility_score: number;
        is_active: boolean;
        match_created_at: Date;
        has_first_message: boolean;
        has_reply_within_24h: boolean;
        has_walk_proposed: boolean;
        has_walk_completed: boolean;
        avg_feedback_rating: number | null;
        size_score: number | null;
        energy_score: number | null;
        behavior_score: number | null;
        walk_score: number | null;
        distance_score: number | null;
        leash_score: number | null;
        overall_score: number | null;
      }>(sql`
        SELECT
          m.id AS match_id,
          m.dog_a_id,
          m.dog_b_id,
          m.compatibility_score,
          m.is_active,
          m.created_at AS match_created_at,

          -- First message exists
          EXISTS (
            SELECT 1 FROM messages msg WHERE msg.match_id = m.id
          ) AS has_first_message,

          -- Reply within 24h: second distinct sender replied within 24h of the first message
          EXISTS (
            SELECT 1
            FROM messages msg1
            JOIN messages msg2 ON msg2.match_id = m.id
              AND msg2.sender_id <> msg1.sender_id
              AND msg2.created_at <= msg1.created_at + interval '24 hours'
            WHERE msg1.match_id = m.id
              AND msg1.created_at = (
                SELECT MIN(created_at) FROM messages WHERE match_id = m.id
              )
          ) AS has_reply_within_24h,

          -- Walk proposed
          EXISTS (
            SELECT 1 FROM walks w WHERE w.match_id = m.id
          ) AS has_walk_proposed,

          -- Walk completed
          EXISTS (
            SELECT 1 FROM walks w WHERE w.match_id = m.id AND w.status = 'completed'
          ) AS has_walk_completed,

          -- Average feedback rating across all feedback for walks in this match
          (
            SELECT AVG(wf.rating)::double precision
            FROM walk_feedback wf
            JOIN walks w ON w.id = wf.walk_id
            WHERE w.match_id = m.id
          ) AS avg_feedback_rating,

          -- Feature vector from swipe_score_logs (average of both directions)
          scores.size_score,
          scores.energy_score,
          scores.behavior_score,
          scores.walk_score,
          scores.distance_score,
          scores.leash_score,
          scores.overall_score

        FROM matches m

        -- Exclude matches already materialized
        LEFT JOIN ml_training_samples mts ON mts.match_id = m.id

        -- Average swipe score logs for the pair (A→B and B→A)
        LEFT JOIN LATERAL (
          SELECT
            AVG(ssl.size_score)::double precision AS size_score,
            AVG(ssl.energy_score)::double precision AS energy_score,
            AVG(ssl.behavior_score)::double precision AS behavior_score,
            AVG(ssl.walk_score)::double precision AS walk_score,
            AVG(ssl.distance_score)::double precision AS distance_score,
            AVG(ssl.leash_score)::double precision AS leash_score,
            AVG(ssl.overall_score)::double precision AS overall_score
          FROM swipe_score_logs ssl
          WHERE (ssl.swiper_dog_id = m.dog_a_id AND ssl.swiped_dog_id = m.dog_b_id)
             OR (ssl.swiper_dog_id = m.dog_b_id AND ssl.swiped_dog_id = m.dog_a_id)
        ) scores ON true

        WHERE m.created_at < ${cutoff}
          AND mts.id IS NULL
      `);

      const rows = result.rows;

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
      await db.insert(mlTrainingSamples).values(samples);

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
