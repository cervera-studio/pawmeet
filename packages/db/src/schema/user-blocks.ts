import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_blocks_pair_idx').on(table.blockerId, table.blockedId),
    index('idx_user_blocks_blocker_id').on(table.blockerId),
    index('idx_user_blocks_blocked_id').on(table.blockedId),
    check('user_blocks_no_self_block', sql`${table.blockerId} != ${table.blockedId}`),
  ],
);
