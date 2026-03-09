import { pgTable, uuid, varchar, text, boolean, timestamp, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const dogProfiles = pgTable('dog_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
});

export const dogPhotos = pgTable('dog_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  dogId: uuid('dog_id').notNull().references(() => dogProfiles.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  position: integer('position').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  moderationStatus: varchar('moderation_status', { length: 10 }).notNull().default('pending'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});
