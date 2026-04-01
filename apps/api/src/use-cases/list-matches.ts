import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { Redis } from '@upstash/redis';
import { createCache } from '../lib/cache.js';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  redis: Redis;
};

export type EnrichedMatch = {
  id: string;
  /** The user's own dog involved in this match */
  dogId: string;
  compatibilityScore: number;
  createdAt: Date;
  isActive: boolean;
  otherDog: { id: string; name: string; breed: string };
  otherOwner: { id: string; displayName: string };
};

export function createListMatches({ dogRepo, matchRepo, userRepo, redis }: Deps) {
  const matchesCache = createCache<{ matches: EnrichedMatch[] }>(redis, {
    prefix: 'cache:matches',
    ttlSeconds: 180,
  });

  return async (userId: string): Promise<Result<{ matches: EnrichedMatch[] }>> => {
    const cached = await matchesCache.get(userId, () => fetchMatches(userId));
    return succeed(cached ?? { matches: [] });
  };

  async function fetchMatches(userId: string): Promise<{ matches: EnrichedMatch[] } | null> {
    const userDogs = await dogRepo.findByOwner(userId, true);
    if (userDogs.length === 0) {
      return { matches: [] };
    }

    const dogIds = userDogs.map((d) => d.id);
    const dogIdSet = new Set(dogIds);
    const activeMatches = await matchRepo.findActiveByDogIds(dogIds);

    if (activeMatches.length === 0) {
      return { matches: [] };
    }

    // Collect all referenced dog IDs
    const allDogIds = new Set<string>();
    for (const m of activeMatches) {
      allDogIds.add(m.dogAId);
      allDogIds.add(m.dogBId);
    }

    // Batch-fetch dogs
    const allDogs = await dogRepo.findByIds([...allDogIds]);
    const dogsById = new Map(allDogs.map((d) => [d.id, d]));

    // Determine other dogs' owner IDs
    const ownerIds = new Set<string>();
    for (const dog of allDogs) {
      if (!dogIdSet.has(dog.id)) {
        ownerIds.add(dog.ownerId);
      }
    }

    // Batch-fetch owners
    const owners = await userRepo.findByIds([...ownerIds]);
    const ownersById = new Map(owners.map((u) => [u.id, u]));

    // Assemble enriched matches
    const enriched: EnrichedMatch[] = activeMatches.map((m) => {
      const myDogId = dogIdSet.has(m.dogAId) ? m.dogAId : m.dogBId;
      const otherDogId = dogIdSet.has(m.dogAId) ? m.dogBId : m.dogAId;
      const otherDog = dogsById.get(otherDogId);
      const otherOwner = otherDog ? ownersById.get(otherDog.ownerId) : undefined;

      return {
        id: m.id,
        dogId: myDogId,
        compatibilityScore: m.compatibilityScore,
        createdAt: m.createdAt,
        isActive: m.isActive,
        otherDog: {
          id: otherDog?.id ?? otherDogId,
          name: otherDog?.name ?? 'Sconosciuto',
          breed: otherDog?.breed ?? '',
        },
        otherOwner: {
          id: otherOwner?.id ?? '',
          displayName: otherOwner?.displayName ?? 'Utente',
        },
      };
    });

    return { matches: enriched };
  }
}
