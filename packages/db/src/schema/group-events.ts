import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';
import { users } from './users';

export const groupEvents = pgTable('group_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMin: integer('duration_min').notNull().default(60),
  location: text('location').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  maxParticipants: integer('max_participants').notNull().default(10),
  visibility: varchar('visibility', { length: 10 }).notNull().default('public'),
  status: varchar('status', { length: 15 }).notNull().default('scheduled'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groupEventParticipants = pgTable('group_event_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => groupEvents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  dogId: uuid('dog_id')
    .notNull()
    .references(() => dogProfiles.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 15 }).notNull().default('accepted'),
  isOrganizer: boolean('is_organizer').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});
