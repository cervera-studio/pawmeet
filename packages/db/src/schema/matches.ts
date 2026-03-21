import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogAId: uuid('dog_a_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    dogBId: uuid('dog_b_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    compatibilityScore: doublePrecision('compatibility_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('idx_matches_dog_a_id').on(table.dogAId),
    index('idx_matches_dog_b_id').on(table.dogBId),
    check(
      'matches_compatibility_score_range',
      sql`${table.compatibilityScore} >= 0 AND ${table.compatibilityScore} <= 1`,
    ),
    // Prevent duplicate matches: normalize pair as (LEAST, GREATEST) to catch both orderings
    unique('uq_matches_dog_pair').on(table.dogAId, table.dogBId),
    check('matches_dog_pair_ordered', sql`${table.dogAId} < ${table.dogBId}`),
  ],
);

export const swipes = pgTable(
  'swipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    swiperDogId: uuid('swiper_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    swipedDogId: uuid('swiped_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    direction: varchar('direction', { length: 5 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('swipes_swiper_dog_id_idx').on(table.swiperDogId),
    index('swipes_swiped_dog_id_idx').on(table.swipedDogId),
    check('swipes_direction_valid', sql`${table.direction} IN ('like', 'pass')`),
    // Prevent duplicate swipes: one swipe per pair
    unique('uq_swipes_pair').on(table.swiperDogId, table.swipedDogId),
  ],
);
