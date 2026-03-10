import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const breeds = pgTable('breeds', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  nameIt: varchar('name_it', { length: 100 }).notNull(),
  group: varchar('group', { length: 50 }),
  sizeCategory: varchar('size_category', { length: 10 }),
  avgWeightKg: integer('avg_weight_kg'),
});
