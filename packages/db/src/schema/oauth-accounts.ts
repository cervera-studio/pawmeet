import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerEmail: varchar('provider_email', { length: 255 }),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_uid_idx').on(table.provider, table.providerUserId),
    index('oauth_accounts_user_id_idx').on(table.userId),
    check('oauth_accounts_provider_valid', sql`${table.provider} IN ('apple', 'google')`),
  ],
);
