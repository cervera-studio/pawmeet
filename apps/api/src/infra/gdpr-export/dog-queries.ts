import {
  dogPhotos,
  dogProfiles,
  matches,
  swipeScoreLogs,
  swipes,
  userMatchingPreferences,
} from '@pawmeet/db';
import { eq, inArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  GdprDog,
  GdprMatchingPreferences,
  GdprSwipeScoreLog,
} from '../../ports/gdpr-export-repository.js';

export function createDogQueries(db: NodePgDatabase) {
  return {
    async getDogsWithPhotos(userId: string): Promise<GdprDog[]> {
      const dogRows = await db
        .select({
          id: dogProfiles.id,
          name: dogProfiles.name,
          birthDate: dogProfiles.birthDate,
          breed: dogProfiles.breed,
          breedSecondary: dogProfiles.breedSecondary,
          size: dogProfiles.size,
          weightKg: dogProfiles.weightKg,
          gender: dogProfiles.gender,
          isNeutered: dogProfiles.isNeutered,
          energyLevel: dogProfiles.energyLevel,
          behaviorWithDogs: dogProfiles.behaviorWithDogs,
          behaviorWithPeople: dogProfiles.behaviorWithPeople,
          leashBehavior: dogProfiles.leashBehavior,
          recallReliability: dogProfiles.recallReliability,
          bio: dogProfiles.bio,
          walkPrefTime: dogProfiles.walkPrefTime,
          walkPrefDurationMin: dogProfiles.walkPrefDurationMin,
          walkPrefDurationMax: dogProfiles.walkPrefDurationMax,
          walkPrefTerrain: dogProfiles.walkPrefTerrain,
          createdAt: dogProfiles.createdAt,
        })
        .from(dogProfiles)
        .where(eq(dogProfiles.ownerId, userId));

      if (dogRows.length === 0) return [];

      const dogIds = dogRows.map((d) => d.id);
      const photoRows = await db
        .select({
          dogId: dogPhotos.dogId,
          url: dogPhotos.url,
          position: dogPhotos.position,
          isPrimary: dogPhotos.isPrimary,
          uploadedAt: dogPhotos.uploadedAt,
        })
        .from(dogPhotos)
        .where(inArray(dogPhotos.dogId, dogIds));

      const photosByDog = new Map<string, GdprDog['photos']>();
      for (const p of photoRows) {
        const arr = photosByDog.get(p.dogId) ?? [];
        arr.push({
          url: p.url,
          position: p.position,
          isPrimary: p.isPrimary,
          uploadedAt: p.uploadedAt,
        });
        photosByDog.set(p.dogId, arr);
      }

      return dogRows.map((d) => ({
        ...d,
        photos: photosByDog.get(d.id) ?? [],
      }));
    },

    async getMatches(dogIds: string[]) {
      if (dogIds.length === 0) return [];
      return db
        .select({
          id: matches.id,
          dogAId: matches.dogAId,
          dogBId: matches.dogBId,
          compatibilityScore: matches.compatibilityScore,
          isActive: matches.isActive,
          createdAt: matches.createdAt,
        })
        .from(matches)
        .where(or(inArray(matches.dogAId, dogIds), inArray(matches.dogBId, dogIds)));
    },

    async getSwipes(dogIds: string[]) {
      if (dogIds.length === 0) return [];
      return db
        .select({
          swiperDogId: swipes.swiperDogId,
          swipedDogId: swipes.swipedDogId,
          direction: swipes.direction,
          createdAt: swipes.createdAt,
        })
        .from(swipes)
        .where(inArray(swipes.swiperDogId, dogIds));
    },

    async getSwipeScoreLogs(dogIds: string[]): Promise<GdprSwipeScoreLog[]> {
      if (dogIds.length === 0) return [];
      return db
        .select({
          swiperDogId: swipeScoreLogs.swiperDogId,
          swipedDogId: swipeScoreLogs.swipedDogId,
          direction: swipeScoreLogs.direction,
          sizeScore: swipeScoreLogs.sizeScore,
          energyScore: swipeScoreLogs.energyScore,
          behaviorScore: swipeScoreLogs.behaviorScore,
          walkScore: swipeScoreLogs.walkScore,
          distanceScore: swipeScoreLogs.distanceScore,
          leashScore: swipeScoreLogs.leashScore,
          overallScore: swipeScoreLogs.overallScore,
          createdAt: swipeScoreLogs.createdAt,
        })
        .from(swipeScoreLogs)
        .where(inArray(swipeScoreLogs.swiperDogId, dogIds));
    },

    async getMatchingPreferences(userId: string): Promise<GdprMatchingPreferences | null> {
      const rows = await db
        .select({
          weightSize: userMatchingPreferences.weightSize,
          weightEnergy: userMatchingPreferences.weightEnergy,
          weightBehavior: userMatchingPreferences.weightBehavior,
          weightWalk: userMatchingPreferences.weightWalk,
          weightDistance: userMatchingPreferences.weightDistance,
          weightLeash: userMatchingPreferences.weightLeash,
          sampleSize: userMatchingPreferences.sampleSize,
          successRate: userMatchingPreferences.successRate,
        })
        .from(userMatchingPreferences)
        .where(eq(userMatchingPreferences.userId, userId))
        .limit(1);

      return rows[0] ?? null;
    },
  };
}
