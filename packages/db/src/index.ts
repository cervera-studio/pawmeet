import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;

export { runMigrations } from './migrate.js';
export * from './schema';
