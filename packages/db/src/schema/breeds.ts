import { sql } from 'drizzle-orm';
import { check, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const breeds = pgTable(
  'breeds',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    group: varchar('group', { length: 50 }),
    sizeCategory: varchar('size_category', { length: 10 }),
    avgWeightKg: integer('avg_weight_kg'),
    // Behavioral scores (1-5 scale, from API Ninjas)
    energy: integer('energy'),
    playfulness: integer('playfulness'),
    trainability: integer('trainability'),
    barking: integer('barking'),
    goodWithOtherDogs: integer('good_with_other_dogs'),
    goodWithChildren: integer('good_with_children'),
    goodWithStrangers: integer('good_with_strangers'),
    protectiveness: integer('protectiveness'),
    shedding: integer('shedding'),
    grooming: integer('grooming'),
  },
  (table) => [
    check(
      'breeds_size_category_valid',
      sql`${table.sizeCategory} IS NULL OR ${table.sizeCategory} IN ('toy', 'small', 'medium', 'large', 'giant')`,
    ),
    check(
      'breeds_avg_weight_positive',
      sql`${table.avgWeightKg} IS NULL OR ${table.avgWeightKg} > 0`,
    ),
    check('breeds_scores_range', sql`${table.energy} IS NULL OR (${table.energy} BETWEEN 1 AND 5)`),
  ],
);
