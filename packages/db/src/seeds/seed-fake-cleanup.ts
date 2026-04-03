import process from 'node:process';
import { like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { users } from '../schema/users';

/**
 * Removes all fake seed profiles (email matching @pawmeet.fake).
 * Dog profiles are cascade-deleted automatically via FK.
 */

const FAKE_EMAIL_DOMAIN = 'pawmeet.fake';

async function cleanup() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log(`[Cleanup] Deleting all users with email @${FAKE_EMAIL_DOMAIN}...`);

  const deleted = await db
    .delete(users)
    .where(like(users.email, `%@${FAKE_EMAIL_DOMAIN}`))
    .returning({ id: users.id, email: users.email });

  console.log(`[Cleanup] Deleted ${deleted.length} fake users (dogs cascade-deleted).`);

  await pool.end();
}

cleanup().catch((err) => {
  console.error('[Cleanup] Failed', err);
  process.exit(1);
});
