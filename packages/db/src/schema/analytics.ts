import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientEventId: varchar('client_event_id', { length: 64 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 64 }),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    clientTimestamp: timestamp('client_timestamp', { withTimezone: true }).notNull(),
    serverTimestamp: timestamp('server_timestamp', { withTimezone: true }).notNull().defaultNow(),
    platform: varchar('platform', { length: 10 }).notNull(),
    appVersion: varchar('app_version', { length: 20 }),
    screenName: varchar('screen_name', { length: 100 }),
  },
  (t) => [
    index('analytics_events_name_ts_idx').on(t.eventName, t.serverTimestamp),
    index('analytics_events_user_ts_idx').on(t.userId, t.serverTimestamp),
  ],
);
