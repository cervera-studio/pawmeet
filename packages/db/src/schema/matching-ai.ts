import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles, matches, users } from './index';

export const swipeScoreLogs = pgTable('swipe_score_logs', {
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
});

export const userMatchingPreferences = pgTable('user_matching_preferences', {
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
});

export const matchInteractions = pgTable('match_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  interactionType: varchar('interaction_type', { length: 30 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  ],
);

export const abExperiments = pgTable('ab_experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: varchar('experiment_id', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 500 }).notNull(),
  aiVariantPercentage: integer('ai_variant_percentage').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const abAssignments = pgTable(
  'ab_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    experimentId: varchar('experiment_id', { length: 50 }).notNull(),
    variant: varchar('variant', { length: 20 }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ab_assignments_user_experiment_idx').on(table.userId, table.experimentId),
  ],
);
