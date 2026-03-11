import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// -- XP Transactions ---------------------------------------------------------

export const xpTransactions = pgTable(
  'xp_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    points: integer('points').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('xp_transactions_user_idx').on(table.userId),
    check('xp_transactions_points_positive', sql`${table.points} > 0`),
  ],
);

// -- Challenges --------------------------------------------------------------

export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    targetValue: integer('target_value').notNull(),
    xpReward: integer('xp_reward').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('challenges_target_value_positive', sql`${table.targetValue} > 0`),
    check('challenges_xp_reward_positive', sql`${table.xpReward} > 0`),
    check('challenges_dates_order', sql`${table.startsAt} < ${table.endsAt}`),
  ],
);

export const userChallenges = pgTable(
  'user_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    progress: integer('progress').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('user_challenges_user_id_challenge_id_unique').on(t.userId, t.challengeId),
    index('user_challenges_challenge_idx').on(t.challengeId),
    check('user_challenges_progress_non_negative', sql`${t.progress} >= 0`),
  ],
);

// -- Achievements ------------------------------------------------------------

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('achievements_user_id_type_unique').on(t.userId, t.type)],
);
