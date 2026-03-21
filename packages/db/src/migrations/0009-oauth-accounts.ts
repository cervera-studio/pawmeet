import process from 'node:process';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

  const sql = neon(DATABASE_URL);

  // -- oauth_accounts table --

  console.log('[DB] 1. Create oauth_accounts table...');
  await sql`
    CREATE TABLE IF NOT EXISTS "oauth_accounts" (
      "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "provider" varchar(20) NOT NULL,
      "provider_user_id" text NOT NULL,
      "provider_email" varchar(255),
      "linked_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "oauth_accounts_provider_valid" CHECK ("provider" IN ('apple', 'google'))
    )
  `;

  console.log('[DB] 2. Create unique index on (provider, provider_user_id)...');
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_uid_idx"
    ON "oauth_accounts" ("provider", "provider_user_id")
  `;

  console.log('[DB] 3. Create index on user_id...');
  await sql`
    CREATE INDEX IF NOT EXISTS "oauth_accounts_user_id_idx"
    ON "oauth_accounts" ("user_id")
  `;

  // -- refresh_tokens: add family_id, device_name, device_os --

  console.log('[DB] 4. Add family_id column to refresh_tokens...');
  await sql`
    ALTER TABLE "refresh_tokens"
    ADD COLUMN IF NOT EXISTS "family_id" uuid DEFAULT gen_random_uuid()
  `;

  console.log('[DB] 5. Backfill family_id for existing rows...');
  await sql`
    UPDATE "refresh_tokens"
    SET "family_id" = gen_random_uuid()
    WHERE "family_id" IS NULL
  `;

  console.log('[DB] 6. Make family_id NOT NULL...');
  await sql`
    ALTER TABLE "refresh_tokens"
    ALTER COLUMN "family_id" SET NOT NULL
  `;

  console.log('[DB] 7. Add device_name column...');
  await sql`
    ALTER TABLE "refresh_tokens"
    ADD COLUMN IF NOT EXISTS "device_name" varchar(100)
  `;

  console.log('[DB] 8. Add device_os column...');
  await sql`
    ALTER TABLE "refresh_tokens"
    ADD COLUMN IF NOT EXISTS "device_os" varchar(20)
  `;

  console.log('[DB] 9. Create index on family_id...');
  await sql`
    CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family_id"
    ON "refresh_tokens" ("family_id")
  `;

  console.log('[DB] Migration 0009-oauth-accounts complete!');
}

migrate().catch((err) => {
  console.error('[DB] Migration failed', err);
  process.exit(1);
});
