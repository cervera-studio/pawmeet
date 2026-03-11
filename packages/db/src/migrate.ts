import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

/**
 * Run pending Drizzle migrations against the database.
 *
 * Usage:
 *   - Programmatically: import and call `runMigrations(databaseUrl)`
 *   - CLI: `pnpm --filter @dogwalk/db db:migrate`
 *
 * Migrations are generated with `pnpm --filter @dogwalk/db db:generate`
 * and stored in `packages/db/drizzle/`.
 */
export async function runMigrations(databaseUrl: string) {
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './drizzle' });
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
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
