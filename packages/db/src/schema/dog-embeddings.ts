import {
  customType,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';

// ── Custom pgvector column type ─────────────────────────────────────────────

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    // Postgres returns vector as '[0.1,0.2,...]'
    return JSON.parse(value as string) as number[];
  },
});

// ── dog_embeddings table ────────────────────────────────────────────────────

export const dogEmbeddings = pgTable(
  'dog_embeddings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogId: uuid('dog_id')
      .notNull()
      .unique()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    embedding: vector('embedding').notNull(),
    modelVersion: varchar('model_version', { length: 50 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dog_embeddings_dog_id_idx').on(table.dogId),
    index('dog_embeddings_model_version_idx').on(table.modelVersion),
  ],
);
