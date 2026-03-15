/**
 * Backfill script — updates existing breed rows in the DB with behavioral scores
 * from the enriched seed data.
 *
 * Usage: DATABASE_URL=xxx npx tsx packages/db/src/seeds/backfill-breed-scores.ts
 */

import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { breeds } from '../schema/breeds';
import { breedsData } from './breeds';

async function backfill() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  const withScores = breedsData.filter((b) => b.energy !== null);
  console.log(`Backfilling scores for ${withScores.length} breeds...`);

  let updated = 0;
  for (const b of withScores) {
    await db
      .update(breeds)
      .set({
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
      })
      .where(eq(breeds.name, b.name));
    updated++;

    if (updated % 50 === 0) {
      console.log(`  Updated ${updated}/${withScores.length}...`);
    }
  }

  console.log(`Done! Updated ${updated} breeds with behavioral scores.`);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
