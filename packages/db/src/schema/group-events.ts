import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';
import { organizations } from './organizations';
import { users } from './users';

export const groupEvents = pgTable(
  'group_events',
  {
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
    visibility: varchar('visibility', { length: 15 }).notNull().default('public'),
    status: varchar('status', { length: 15 }).notNull().default('scheduled'),
    recurrenceRule: varchar('recurrence_rule', { length: 255 }),
    recurrenceEnd: timestamp('recurrence_end', { withTimezone: true }),
    parentEventId: uuid('parent_event_id').references((): any => groupEvents.id, {
      onDelete: 'set null',
    }),
    category: varchar('category', { length: 20 }).notNull().default('walk'),
    requiresApproval: boolean('requires_approval').notNull().default(false),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    isOfficial: boolean('is_official').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('group_events_created_by_idx').on(table.createdBy),
    index('group_events_location_idx').on(table.latitude, table.longitude),
    index('group_events_parent_idx').on(table.parentEventId),
    index('group_events_category_idx').on(table.category),
    check(
      'group_events_duration_range',
      sql`${table.durationMin} >= 15 AND ${table.durationMin} <= 180`,
    ),
    check('group_events_latitude_range', sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check(
      'group_events_longitude_range',
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
    check(
      'group_events_max_participants_range',
      sql`${table.maxParticipants} >= 2 AND ${table.maxParticipants} <= 500`,
    ),
    check(
      'group_events_visibility_valid',
      sql`${table.visibility} IN ('public', 'friends_only', 'invite_only')`,
    ),
    check(
      'group_events_status_valid',
      sql`${table.status} IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'template')`,
    ),
    check('group_events_category_valid', sql`${table.category} IN ('walk', 'meetup', 'training')`),
    index('group_events_organization_idx').on(table.organizationId),
  ],
);

export const groupEventParticipants = pgTable(
  'group_event_participants',
  {
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
  },
  (table) => [
    index('group_event_participants_event_idx').on(table.eventId),
    index('group_event_participants_user_idx').on(table.userId),
    index('group_event_participants_dog_idx').on(table.dogId),
    index('group_event_participants_event_status_idx').on(table.eventId, table.status),
    check(
      'group_event_participants_status_valid',
      sql`${table.status} IN ('pending', 'accepted', 'declined', 'removed', 'cancelled')`,
    ),
  ],
);
