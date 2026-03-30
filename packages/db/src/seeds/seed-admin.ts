import process from 'node:process';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { adminUsers } from '../schema/admin-users';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  const passwordHash = await hash('Admin123!', 12);

  console.log('[Seed] Seeding super_admin user...');

  await db
    .insert(adminUsers)
    .values({
      email: 'admin@pawmeet.io',
      passwordHash,
      displayName: 'Super Admin',
      role: 'super_admin',
      isActive: true,
    })
    .onConflictDoNothing();

  console.log('[Seed] Done. Admin user created: admin@pawmeet.io');
}

seed().catch((err) => {
  console.error('[Seed] Seed failed', err);
  process.exit(1);
});
