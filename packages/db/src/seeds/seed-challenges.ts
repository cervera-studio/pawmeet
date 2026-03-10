import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { challenges } from '../schema/gamification';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  console.log('Seeding default challenges...');

  await db
    .insert(challenges)
    .values([
      {
        type: 'walk_count',
        title: 'Camminatore della settimana',
        description: 'Completa 5 passeggiate questa settimana',
        targetValue: 5,
        xpReward: 100,
        startsAt: now,
        endsAt: oneWeekFromNow,
      },
      {
        type: 'walk_distance_km',
        title: 'Maratoneta',
        description: 'Percorri 20 km in totale questo mese',
        targetValue: 20,
        xpReward: 200,
        startsAt: now,
        endsAt: oneMonthFromNow,
      },
      {
        type: 'new_matches',
        title: 'Socializzatore',
        description: 'Trova 3 nuovi compagni di passeggiata questa settimana',
        targetValue: 3,
        xpReward: 150,
        startsAt: now,
        endsAt: oneWeekFromNow,
      },
      {
        type: 'group_events_joined',
        title: 'Vita da branco',
        description: 'Partecipa a 2 eventi di gruppo questo mese',
        targetValue: 2,
        xpReward: 120,
        startsAt: now,
        endsAt: oneMonthFromNow,
      },
    ])
    .onConflictDoNothing();

  console.log('Done. Default challenges seeded.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
