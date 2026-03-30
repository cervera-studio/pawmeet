import process from 'node:process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/**
 * Run pending Drizzle migrations against the database.
 *
 * Usage:
 *   - Programmatically: import and call `runMigrations(databaseUrl)`
 *   - CLI: `pnpm --filter @pawmeet/db db:migrate`
 *
 * Migrations are generated with `pnpm --filter @pawmeet/db db:generate`
 * and stored in `packages/db/drizzle/`.
 */
export async function runMigrations(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}

// CLI entry point
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed', err);
      process.exit(1);
    });
}
