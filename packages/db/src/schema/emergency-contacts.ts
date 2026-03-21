import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { walks } from './walks';

export const emergencyContacts = pgTable(
  'emergency_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    relationship: varchar('relationship', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_emergency_contacts_user_id').on(table.userId),
    check('emergency_contacts_name_not_empty', sql`length(trim(${table.name})) > 0`),
    check('emergency_contacts_phone_not_empty', sql`length(trim(${table.phone})) > 0`),
  ],
);

export const walkSafetyCheckins = pgTable(
  'walk_safety_checkins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walkId: uuid('walk_id')
      .notNull()
      .references(() => walks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_walk_safety_checkins_walk_id').on(table.walkId),
    index('idx_walk_safety_checkins_user_id').on(table.userId),
    check(
      'walk_safety_checkins_type_valid',
      sql`${table.type} IN ('checkin', 'sos', 'auto_alert')`,
    ),
    check(
      'walk_safety_checkins_lat_range',
      sql`${table.latitude} IS NULL OR (${table.latitude} BETWEEN -90 AND 90)`,
    ),
    check(
      'walk_safety_checkins_lon_range',
      sql`${table.longitude} IS NULL OR (${table.longitude} BETWEEN -180 AND 180)`,
    ),
  ],
);
