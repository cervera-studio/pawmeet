import { mlTrainingSamples } from '@pawmeet/db';
import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  MatureMatchRow,
  MlTrainingRepository,
  TrainingSampleInsert,
} from '../ports/ml-training-repository.js';

export class DrizzleMlTrainingRepository implements MlTrainingRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findMatureMatchesForLabeling(cutoff: Date): Promise<MatureMatchRow[]> {
    const result = await this.db.execute<MatureMatchRow>(sql`
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

    return result.rows;
  }

  async insertTrainingSamples(samples: TrainingSampleInsert[]): Promise<void> {
    if (samples.length === 0) return;

    await this.db.insert(mlTrainingSamples).values(samples);
  }
}
