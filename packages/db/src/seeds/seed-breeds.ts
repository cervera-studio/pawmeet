import process from 'node:process';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { breeds } from '../schema/breeds';
import { breedsData } from './breeds';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log(`[Seed] Seeding ${breedsData.length} breeds...`);

  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < breedsData.length; i += batchSize) {
    const batch = breedsData.slice(i, i + batchSize);
    await db
      .insert(breeds)
      .values(
        batch.map((b) => ({
          code: b.code,
          group: b.group,
          sizeCategory: b.sizeCategory,
          avgWeightKg: b.avgWeightKg,
          energy: b.energy,
          playfulness: b.playfulness,
          trainability: b.trainability,
          barking: b.barking,
          goodWithOtherDogs: b.goodWithOtherDogs,
          goodWithChildren: b.goodWithChildren,
          goodWithStrangers: b.goodWithStrangers,
          protectiveness: b.protectiveness,
          shedding: b.shedding,
          grooming: b.grooming,
        })),
      )
      .onConflictDoNothing();
    console.log(
      `[Seed] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(breedsData.length / batchSize)}`,
    );
  }

  console.log('[Seed] Done seeding breeds.');
}

seed().catch((err) => {
  console.error('[Seed] Seed failed', err);
  process.exit(1);
});
