import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const passkeyCredentials = pgTable(
  'passkey_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: bytea('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    deviceType: varchar('device_type', { length: 20 }).notNull(),
    backedUp: boolean('backed_up').notNull().default(false),
    transports: text('transports').array(),
    friendlyName: varchar('friendly_name', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    index('passkey_credentials_user_id_idx').on(table.userId),
    index('passkey_credentials_credential_id_idx').on(table.credentialId),
  ],
);
