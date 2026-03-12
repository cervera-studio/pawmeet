import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { groupEvents } from './group-events';
import { organizations } from './organizations';

export const eventSponsors = pgTable(
  'event_sponsors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => groupEvents.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    tier: varchar('tier', { length: 30 }).notNull(),
    logoPlacement: varchar('logo_placement', { length: 30 }).notNull().default('footer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('event_sponsors_pair_idx').on(table.eventId, table.organizationId),
    check(
      'event_sponsors_tier_valid',
      sql`${table.tier} IN ('title', 'gold', 'silver', 'partner')`,
    ),
    check(
      'event_sponsors_logo_placement_valid',
      sql`${table.logoPlacement} IN ('header', 'footer', 'banner')`,
    ),
  ],
);
