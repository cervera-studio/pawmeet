import process from 'node:process';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { GROUP_EVENT_VISIBILITY } from '@pawmeet/types';
import { dogProfiles } from '../schema/dogs';
import { groupEventParticipants, groupEvents } from '../schema/group-events';
import { users } from '../schema/users';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // Find existing users with dogs to create realistic events
  const allUsers = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .limit(5);

  if (allUsers.length < 2) {
    console.log('[Seed] Not enough users found. Seed some users first.');
    return;
  }

  // Get first dog for each user
  const userDogs = await Promise.all(
    allUsers.map(async (u) => {
      const [dog] = await db
        .select({ id: dogProfiles.id })
        .from(dogProfiles)
        .where(eq(dogProfiles.ownerId, u.id))
        .limit(1);
      return { userId: u.id, displayName: u.displayName, dogId: dog?.id ?? null };
    }),
  );

  const usersWithDogs = userDogs.filter((u) => u.dogId !== null);
  if (usersWithDogs.length < 2) {
    console.log('[Seed] Not enough users with dogs. Seed some dogs first.');
    return;
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const organizer1 = usersWithDogs[0];
  const organizer2 = usersWithDogs[1];
  if (!(organizer1 && organizer2)) {
    console.log('[Seed] Not enough users with dogs.');
    return;
  }

  const events = [
    {
      createdBy: organizer1.userId,
      title: 'Passeggiata mattutina al Parco Sempione',
      description: 'Ritrovo al cancello principale, passeggiata libera nel parco.',
      scheduledAt: new Date(now.getTime() + 2 * day),
      durationMin: 60,
      location: 'Parco Sempione, Milano',
      latitude: 45.4729,
      longitude: 9.1797,
      maxParticipants: 10,
      visibility: GROUP_EVENT_VISIBILITY.PUBLIC,
      status: 'scheduled',
    },
    {
      createdBy: organizer1.userId,
      title: 'Aperitivo con cani al Naviglio',
      description: 'Passeggiatina lungo il Naviglio e poi aperitivo dog-friendly.',
      scheduledAt: new Date(now.getTime() + 5 * day),
      durationMin: 90,
      location: 'Naviglio Grande, Milano',
      latitude: 45.4494,
      longitude: 9.1681,
      maxParticipants: 8,
      visibility: GROUP_EVENT_VISIBILITY.PUBLIC,
      status: 'scheduled',
    },
    {
      createdBy: organizer2.userId,
      title: 'Corsa al parco di Monza',
      description: 'Per cani energici! Corsa libera nel parco.',
      scheduledAt: new Date(now.getTime() + 3 * day),
      durationMin: 45,
      location: 'Parco di Monza',
      latitude: 45.5968,
      longitude: 9.3038,
      maxParticipants: 6,
      visibility: GROUP_EVENT_VISIBILITY.PUBLIC,
      status: 'scheduled',
    },
    {
      createdBy: organizer1.userId,
      title: 'Evento passato — completato',
      description: null,
      scheduledAt: new Date(now.getTime() - 2 * day),
      durationMin: 60,
      location: 'Giardini Indro Montanelli, Milano',
      latitude: 45.4738,
      longitude: 9.1975,
      maxParticipants: 10,
      visibility: GROUP_EVENT_VISIBILITY.PUBLIC,
      status: 'completed',
    },
  ];

  console.log(`[Seed] Seeding ${events.length} group events...`);

  for (const eventData of events) {
    const rows = await db.insert(groupEvents).values(eventData).returning();
    const event = rows[0];
    if (!event) continue;

    // Add creator as organizer
    const creator = usersWithDogs.find((u) => u.userId === eventData.createdBy);
    if (creator?.dogId) {
      await db.insert(groupEventParticipants).values({
        eventId: event.id,
        userId: creator.userId,
        dogId: creator.dogId,
        status: 'accepted',
        isOrganizer: true,
      });
    }

    // Add other participants to some events
    if (eventData.status === 'scheduled' && usersWithDogs.length > 1) {
      for (const participant of usersWithDogs.slice(1, 3)) {
        if (participant.userId === eventData.createdBy) continue;
        if (!participant.dogId) continue;

        await db
          .insert(groupEventParticipants)
          .values({
            eventId: event.id,
            userId: participant.userId,
            dogId: participant.dogId,
            status: 'accepted',
            isOrganizer: false,
          })
          .onConflictDoNothing();
      }
    }

    console.log(`[Seed] Created: ${eventData.title} (${eventData.status})`);
  }

  console.log('[Seed] Done seeding group events.');
}

seed().catch((err) => {
  console.error('[Seed] Seed failed', err);
  process.exit(1);
});
