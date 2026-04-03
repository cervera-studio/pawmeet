import process from 'node:process';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { dogPhotos, dogProfiles } from '../schema/dogs';
import { users } from '../schema/users';

/**
 * Copies a user (+ their dogs and photos) from one Neon branch to another.
 *
 * Usage:
 *   SOURCE_DB="..." TARGET_DB="..." COPY_EMAIL="user@example.com" tsx seed-copy-user.ts
 */

const SOURCE_DB = process.env.SOURCE_DB;
const TARGET_DB = process.env.TARGET_DB;
const COPY_EMAIL = process.env.COPY_EMAIL;

if (!SOURCE_DB || !TARGET_DB || !COPY_EMAIL) {
  console.error('Required: SOURCE_DB, TARGET_DB, COPY_EMAIL');
  process.exit(1);
}

const email: string = COPY_EMAIL;

const sourcePool = new pg.Pool({ connectionString: SOURCE_DB });
const targetPool = new pg.Pool({ connectionString: TARGET_DB });
const source = drizzle(sourcePool);
const target = drizzle(targetPool);

async function main() {
  // 1. Find user in source
  const [user] = await source.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.error(`User ${COPY_EMAIL} not found in source DB`);
    process.exit(1);
  }
  console.log(`Found user: ${user.displayName} (${user.id})`);

  // 2. Copy user to target (upsert by email)
  await target
    .insert(users)
    .values(user)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: user.displayName,
        passwordHash: user.passwordHash,
        avatarUrl: user.avatarUrl,
        latitude: user.latitude,
        longitude: user.longitude,
        locationUpdatedAt: user.locationUpdatedAt,
        searchRadiusKm: user.searchRadiusKm,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        notificationPrefs: user.notificationPrefs,
        dateOfBirth: user.dateOfBirth,
        locale: user.locale,
        onboardingCompletedAt: user.onboardingCompletedAt,
        privacyPrefs: user.privacyPrefs,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyPolicyVersion: user.privacyPolicyVersion,
      },
    });
  console.log('User copied');

  // 3. Resolve target user ID (might differ if email already existed with different UUID)
  const [targetUser] = await target.select().from(users).where(eq(users.email, email));
  if (!targetUser) {
    console.error('Target user not found after upsert');
    process.exit(1);
  }
  const targetUserId = targetUser.id;

  // 4. Copy dogs
  const dogs = await source.select().from(dogProfiles).where(eq(dogProfiles.ownerId, user.id));
  console.log(`Found ${dogs.length} dog(s)`);

  for (const dog of dogs) {
    const dogData = { ...dog, ownerId: targetUserId };
    await target
      .insert(dogProfiles)
      .values(dogData)
      .onConflictDoUpdate({
        target: dogProfiles.id,
        set: {
          name: dog.name,
          breed: dog.breed,
          breedSecondary: dog.breedSecondary,
          size: dog.size,
          weightKg: dog.weightKg,
          gender: dog.gender,
          energyLevel: dog.energyLevel,
          birthDate: dog.birthDate,
          behaviorWithDogs: dog.behaviorWithDogs,
          isNeutered: dog.isNeutered,
          leashBehavior: dog.leashBehavior,
          bio: dog.bio,
          isActive: dog.isActive,
        },
      });
    console.log(`  Dog: ${dog.name}`);

    // 5. Copy photos
    const photos = await source.select().from(dogPhotos).where(eq(dogPhotos.dogId, dog.id));
    for (const photo of photos) {
      await target.insert(dogPhotos).values(photo).onConflictDoNothing();
    }
    console.log(`  Photos: ${photos.length}`);
  }

  console.log('Done!');
  await sourcePool.end();
  await targetPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
