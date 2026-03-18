import process from 'node:process';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

  const sql = neon(DATABASE_URL);

  console.log('[DB] 1. Add code column...');
  await sql`ALTER TABLE "breeds" ADD COLUMN IF NOT EXISTS "code" varchar(100)`;

  console.log('[DB] 2. Populate code from name (slugify)...');
  await sql`UPDATE "breeds" SET "code" = regexp_replace(regexp_replace(regexp_replace(lower("name"), '[^a-z0-9]+', '_', 'g'), '^_|_$', '', 'g'), '_+', '_', 'g') WHERE "code" IS NULL`;

  console.log('[DB] 3. Make code NOT NULL...');
  await sql`ALTER TABLE "breeds" ALTER COLUMN "code" SET NOT NULL`;

  console.log('[DB] 4. Add unique constraint...');
  await sql`ALTER TABLE "breeds" ADD CONSTRAINT "breeds_code_unique" UNIQUE ("code")`;

  console.log('[DB] 5. Drop old name unique constraint...');
  await sql`ALTER TABLE "breeds" DROP CONSTRAINT IF EXISTS "breeds_name_unique"`;

  console.log('[DB] 6. Drop name column...');
  await sql`ALTER TABLE "breeds" DROP COLUMN IF EXISTS "name"`;

  console.log('[DB] 7. Drop name_it column...');
  await sql`ALTER TABLE "breeds" DROP COLUMN IF EXISTS "name_it"`;

  console.log('[DB] Migration complete!');
}

migrate().catch((err) => {
  console.error('[DB] Migration failed', err);
  process.exit(1);
});
