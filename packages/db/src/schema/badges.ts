import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';

export const badges = pgTable(
  'badges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogId: uuid('dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('badges_dog_id_type_unique').on(t.dogId, t.type)],
);
