import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_follows_pair_idx').on(table.followerId, table.followingId),
    index('user_follows_follower_idx').on(table.followerId),
    index('user_follows_following_idx').on(table.followingId),
    check('user_follows_no_self_follow', sql`${table.followerId} != ${table.followingId}`),
  ],
);
