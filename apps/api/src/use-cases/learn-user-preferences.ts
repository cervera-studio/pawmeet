import type { UserMatchingPreferences } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import { computeSuccessRate, learnWeightsFromSwipes } from '@pawmeet/utils';
import type { DogRepository, MatchingAiRepository, MatchRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
};

export function createLearnUserPreferences({ matchingAiRepo, matchRepo, dogRepo }: Deps) {
  return async (userId: string): Promise<Result<{ preferences: UserMatchingPreferences }>> => {
    // Get all user's dogs
    const dogs = await dogRepo.findByOwner(userId);
    if (dogs.length === 0) {
      // Nothing to learn from; save defaults
      const prefs = await matchingAiRepo.upsertUserPreferences({
        userId,
        weightSize: 0.25,
        weightEnergy: 0.25,
        weightBehavior: 0.2,
        weightWalk: 0.15,
        weightDistance: 0.1,
        weightLeash: 0.05,
        sampleSize: 0,
        successRate: 0,
      });
      return succeed({ preferences: prefs });
    }

    // Collect swipe score logs across all user's dogs
    const allLogs = [];
    for (const dog of dogs) {
      const logs = await matchingAiRepo.findSwipeScoreLogsByDog(dog.id, 200);
      allLogs.push(...logs);
    }

    // Learn weights from swipe patterns
    const weights = learnWeightsFromSwipes(allLogs);

    // Compute success rate from match interactions
    const dogIds = dogs.map((d) => d.id);
    const activeMatches = await matchRepo.findActiveByDogIds(dogIds);
    const matchIds = activeMatches.map((m) => m.id);
    const interactions = await matchingAiRepo.findInteractionsByMatches(matchIds);
    const successRate = computeSuccessRate(matchIds, interactions);

    const prefs = await matchingAiRepo.upsertUserPreferences({
      userId,
      weightSize: weights.size,
      weightEnergy: weights.energy,
      weightBehavior: weights.behavior,
      weightWalk: weights.walk,
      weightDistance: weights.distance,
      weightLeash: weights.leash,
      sampleSize: allLogs.length,
      successRate,
    });

    return succeed({ preferences: prefs });
  };
}
