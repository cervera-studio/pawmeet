export interface MatureMatchRow {
  [key: string]: unknown;
  match_id: string;
  dog_a_id: string;
  dog_b_id: string;
  compatibility_score: number | null;
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
}

export interface TrainingSampleInsert {
  matchId: string;
  dogAId: string;
  dogBId: string;
  featureVector: Record<string, unknown>;
  outcomeLabel: number;
  maturedAt: Date;
  label?: number;
  labelComponents?: Record<string, unknown>;
}

export interface MlTrainingRepository {
  findMatureMatchesForLabeling(cutoff: Date): Promise<MatureMatchRow[]>;
  insertTrainingSamples(samples: TrainingSampleInsert[]): Promise<void>;
}
