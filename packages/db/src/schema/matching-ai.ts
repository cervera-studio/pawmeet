import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles, matches, users } from './index';

export const swipeScoreLogs = pgTable(
  'swipe_score_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    swiperDogId: uuid('swiper_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    swipedDogId: uuid('swiped_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    direction: varchar('direction', { length: 5 }).notNull(),
    sizeScore: doublePrecision('size_score').notNull(),
    energyScore: doublePrecision('energy_score').notNull(),
    behaviorScore: doublePrecision('behavior_score').notNull(),
    walkScore: doublePrecision('walk_score').notNull(),
    distanceScore: doublePrecision('distance_score').notNull(),
    leashScore: doublePrecision('leash_score').notNull(),
    overallScore: doublePrecision('overall_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('swipe_score_logs_swiper_dog_idx').on(table.swiperDogId),
    index('swipe_score_logs_swiped_dog_idx').on(table.swipedDogId),
    check('swipe_score_logs_direction_valid', sql`${table.direction} IN ('like', 'pass')`),
    check(
      'swipe_score_logs_size_score_range',
      sql`${table.sizeScore} >= 0 AND ${table.sizeScore} <= 1`,
    ),
    check(
      'swipe_score_logs_energy_score_range',
      sql`${table.energyScore} >= 0 AND ${table.energyScore} <= 1`,
    ),
    check(
      'swipe_score_logs_behavior_score_range',
      sql`${table.behaviorScore} >= 0 AND ${table.behaviorScore} <= 1`,
    ),
    check(
      'swipe_score_logs_walk_score_range',
      sql`${table.walkScore} >= 0 AND ${table.walkScore} <= 1`,
    ),
    check(
      'swipe_score_logs_distance_score_range',
      sql`${table.distanceScore} >= 0 AND ${table.distanceScore} <= 1`,
    ),
    check(
      'swipe_score_logs_leash_score_range',
      sql`${table.leashScore} >= 0 AND ${table.leashScore} <= 1`,
    ),
    check(
      'swipe_score_logs_overall_score_range',
      sql`${table.overallScore} >= 0 AND ${table.overallScore} <= 1`,
    ),
  ],
);

export const userMatchingPreferences = pgTable(
  'user_matching_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    weightSize: doublePrecision('weight_size').notNull().default(0.25),
    weightEnergy: doublePrecision('weight_energy').notNull().default(0.25),
    weightBehavior: doublePrecision('weight_behavior').notNull().default(0.2),
    weightWalk: doublePrecision('weight_walk').notNull().default(0.15),
    weightDistance: doublePrecision('weight_distance').notNull().default(0.1),
    weightLeash: doublePrecision('weight_leash').notNull().default(0.05),
    sampleSize: integer('sample_size').notNull().default(0),
    successRate: doublePrecision('success_rate').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'user_matching_prefs_weight_size_range',
      sql`${table.weightSize} >= 0 AND ${table.weightSize} <= 1`,
    ),
    check(
      'user_matching_prefs_weight_energy_range',
      sql`${table.weightEnergy} >= 0 AND ${table.weightEnergy} <= 1`,
    ),
    check(
      'user_matching_prefs_weight_behavior_range',
      sql`${table.weightBehavior} >= 0 AND ${table.weightBehavior} <= 1`,
    ),
    check(
      'user_matching_prefs_weight_walk_range',
      sql`${table.weightWalk} >= 0 AND ${table.weightWalk} <= 1`,
    ),
    check(
      'user_matching_prefs_weight_distance_range',
      sql`${table.weightDistance} >= 0 AND ${table.weightDistance} <= 1`,
    ),
    check(
      'user_matching_prefs_weight_leash_range',
      sql`${table.weightLeash} >= 0 AND ${table.weightLeash} <= 1`,
    ),
    check('user_matching_prefs_sample_size_non_negative', sql`${table.sampleSize} >= 0`),
    check(
      'user_matching_prefs_success_rate_range',
      sql`${table.successRate} >= 0 AND ${table.successRate} <= 1`,
    ),
  ],
);

export const matchInteractions = pgTable(
  'match_interactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    interactionType: varchar('interaction_type', { length: 30 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('match_interactions_match_idx').on(table.matchId),
    index('match_interactions_user_idx').on(table.userId),
  ],
);

export const userActivityWindows = pgTable(
  'user_activity_windows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    hourOfDay: integer('hour_of_day').notNull(),
    activityCount: integer('activity_count').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_activity_windows_user_day_hour_idx').on(
      table.userId,
      table.dayOfWeek,
      table.hourOfDay,
    ),
    check(
      'user_activity_windows_day_range',
      sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`,
    ),
    check(
      'user_activity_windows_hour_range',
      sql`${table.hourOfDay} >= 0 AND ${table.hourOfDay} <= 23`,
    ),
    check('user_activity_windows_count_positive', sql`${table.activityCount} >= 1`),
  ],
);

// A/B experiments and variant assignments are managed via Redis (Upstash).

// ── ML Training ─────────────────────────────────────────────────────────────

export const mlTrainingSamples = pgTable(
  'ml_training_samples',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    dogAId: uuid('dog_a_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    dogBId: uuid('dog_b_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    featureVector: jsonb('feature_vector').notNull().$type<Record<string, unknown> | number[]>(),
    outcomeLabel: doublePrecision('outcome_label').notNull(),
    labelVersion: integer('label_version').notNull().default(1),
    maturedAt: timestamp('matured_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ml_training_samples_matured_at_idx').on(table.maturedAt),
    index('ml_training_samples_label_version_idx').on(table.labelVersion),
    check(
      'ml_training_samples_outcome_label_range',
      sql`${table.outcomeLabel} >= -0.3 AND ${table.outcomeLabel} <= 1.0`,
    ),
  ],
);

// ── ML Model Registry ───────────────────────────────────────────────────────

export const mlModelRegistry = pgTable(
  'ml_model_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version: varchar('version', { length: 50 }).notNull().unique(),
    r2Path: varchar('r2_path', { length: 500 }).notNull(),
    trainingSamplesCount: integer('training_samples_count').notNull(),
    metrics: jsonb('metrics').$type<{
      auc: number;
      precision: number;
      recall: number;
      f1?: number;
    }>(),
    featureSchema: jsonb('feature_schema').$type<string[]>(),
    hyperparameters: jsonb('hyperparameters').$type<Record<string, string | number | boolean>>(),
    isActive: boolean('is_active').notNull().default(false),
    promotedAt: timestamp('promoted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ml_model_registry_is_active_idx').on(table.isActive)],
);

// ── Experiment Metrics Snapshots ────────────────────────────────────────────

export const experimentMetricsSnapshots = pgTable(
  'experiment_metrics_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    experimentName: varchar('experiment_name', { length: 100 }).notNull(),
    snapshotDate: timestamp('snapshot_date', { mode: 'date' }).notNull(),
    variant: varchar('variant', { length: 50 }).notNull(),
    userCount: integer('user_count').notNull().default(0),
    totalDiscoveries: integer('total_discoveries').notNull().default(0),
    totalLikes: integer('total_likes').notNull().default(0),
    totalMatches: integer('total_matches').notNull().default(0),
    totalWalksCompleted: integer('total_walks_completed').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    avgCompatibilityScore: doublePrecision('avg_compatibility_score'),
    avgMatchRate: doublePrecision('avg_match_rate'),
    retainedD7: integer('retained_d7').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('experiment_metrics_snapshots_name_date_variant_idx').on(
      table.experimentName,
      table.snapshotDate,
      table.variant,
    ),
    index('experiment_metrics_snapshots_date_idx').on(table.snapshotDate),
  ],
);

// ── Model Performance Daily ─────────────────────────────────────────────────

export const modelPerformanceDaily = pgTable(
  'model_performance_daily',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotDate: timestamp('snapshot_date', { mode: 'date' }).notNull(),
    totalPredictions: integer('total_predictions').notNull().default(0),
    totalMatches: integer('total_matches').notNull().default(0),
    avgOverallScore: doublePrecision('avg_overall_score'),
    scoreBuckets: jsonb('score_buckets').$type<Record<string, unknown>>(),
    weightDistribution: jsonb('weight_distribution').$type<Record<string, unknown>>(),
    successRateDistribution: jsonb('success_rate_distribution').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('model_performance_daily_snapshot_date_idx').on(table.snapshotDate)],
);
