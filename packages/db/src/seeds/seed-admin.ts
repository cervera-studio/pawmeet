import { hash } from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { adminUsers } from '../schema/admin-users';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  const passwordHash = await hash('Admin123!', 12);

  console.log('Seeding super_admin user...');

  await db
    .insert(adminUsers)
    .values({
      email: 'admin@dogwalk.app',
      passwordHash,
      displayName: 'Super Admin',
      role: 'super_admin',
      isActive: true,
    })
    .onConflictDoNothing();

  console.log('Done. Admin user created: admin@dogwalk.app');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
