import { boolean, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const waitlistSubscribers = pgTable(
  'waitlist_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    locale: varchar('locale', { length: 5 }).notNull().default('it'),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
    unsubscribed: boolean('unsubscribed').notNull().default(false),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    source: varchar('source', { length: 50 }).notNull().default('landing'),
  },
  (table) => [
    index('waitlist_email_idx').on(table.email),
    index('waitlist_subscribed_at_idx').on(table.subscribedAt),
  ],
);
