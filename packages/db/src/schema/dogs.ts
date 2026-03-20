import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const dogProfiles = pgTable(
  'dog_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    birthDate: timestamp('birth_date', { withTimezone: true }).notNull(),
    breed: varchar('breed', { length: 100 }).notNull(),
    breedSecondary: varchar('breed_secondary', { length: 100 }),
    size: varchar('size', { length: 10 }).notNull(),
    weightKg: doublePrecision('weight_kg').notNull(),
    gender: varchar('gender', { length: 10 }).notNull(),
    isNeutered: boolean('is_neutered').notNull(),
    energyLevel: varchar('energy_level', { length: 15 }).notNull(),
    behaviorWithDogs: varchar('behavior_with_dogs', { length: 20 }).notNull(),
    behaviorWithPeople: varchar('behavior_with_people', { length: 20 }).notNull(),
    leashBehavior: varchar('leash_behavior', { length: 20 }).notNull(),
    recallReliability: varchar('recall_reliability', { length: 20 }),
    bio: text('bio'),
    walkPrefTime: jsonb('walk_pref_time').notNull().$type<string[]>(),
    walkPrefDurationMin: integer('walk_pref_duration_min').notNull(),
    walkPrefDurationMax: integer('walk_pref_duration_max').notNull(),
    walkPrefTerrain: jsonb('walk_pref_terrain').notNull().$type<string[]>(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dog_profiles_owner_id').on(table.ownerId),
    check(
      'dog_profiles_size_valid',
      sql`${table.size} IN ('toy', 'small', 'medium', 'large', 'giant')`,
    ),
    check('dog_profiles_weight_range', sql`${table.weightKg} >= 0.5 AND ${table.weightKg} <= 100`),
    check('dog_profiles_gender_valid', sql`${table.gender} IN ('male', 'female')`),
    check(
      'dog_profiles_energy_level_valid',
      sql`${table.energyLevel} IN ('low', 'medium', 'high', 'very_high')`,
    ),
    check(
      'dog_profiles_behavior_dogs_valid',
      sql`${table.behaviorWithDogs} IN ('very_friendly', 'friendly', 'selective', 'reactive')`,
    ),
    check(
      'dog_profiles_behavior_people_valid',
      sql`${table.behaviorWithPeople} IN ('very_friendly', 'friendly', 'shy', 'wary')`,
    ),
    check(
      'dog_profiles_leash_behavior_valid',
      sql`${table.leashBehavior} IN ('excellent', 'good', 'in_training', 'difficult')`,
    ),
    check(
      'dog_profiles_recall_valid',
      sql`${table.recallReliability} IS NULL OR ${table.recallReliability} IN ('reliable', 'partial', 'unreliable')`,
    ),
    check(
      'dog_profiles_walk_duration_min_range',
      sql`${table.walkPrefDurationMin} >= 15 AND ${table.walkPrefDurationMin} <= 180`,
    ),
    check(
      'dog_profiles_walk_duration_max_range',
      sql`${table.walkPrefDurationMax} >= 15 AND ${table.walkPrefDurationMax} <= 180`,
    ),
    check(
      'dog_profiles_walk_duration_order',
      sql`${table.walkPrefDurationMin} <= ${table.walkPrefDurationMax}`,
    ),
  ],
);

export const dogPhotos = pgTable(
  'dog_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogId: uuid('dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    moderationStatus: varchar('moderation_status', { length: 10 }).notNull().default('pending'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('dog_photos_dog_id_idx').on(table.dogId),
    check('dog_photos_position_range', sql`${table.position} >= 0 AND ${table.position} <= 5`),
    check(
      'dog_photos_moderation_status_valid',
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);
