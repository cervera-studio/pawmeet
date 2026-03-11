import { sql } from 'drizzle-orm';
import { check, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const breeds = pgTable(
  'breeds',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    nameIt: varchar('name_it', { length: 100 }).notNull(),
    group: varchar('group', { length: 50 }),
    sizeCategory: varchar('size_category', { length: 10 }),
    avgWeightKg: integer('avg_weight_kg'),
  },
  (table) => [
    check(
      'breeds_size_category_valid',
      sql`${table.sizeCategory} IS NULL OR ${table.sizeCategory} IN ('toy', 'piccola', 'media', 'grande', 'gigante')`,
    ),
    check(
      'breeds_avg_weight_positive',
      sql`${table.avgWeightKg} IS NULL OR ${table.avgWeightKg} > 0`,
    ),
  ],
);
