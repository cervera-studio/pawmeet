import { EXPERIMENT } from '@dogwalk/config';
import type { MatchingInsights, OptimalTimeWindow } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { DogRepository, MatchingAiRepository, MatchRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
};

export function createGetMatchingInsights({ matchingAiRepo, matchRepo, dogRepo }: Deps) {
  return async (userId: string, dogId: string): Promise<Result<{ insights: MatchingInsights }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Get swipe history stats
    const swipeLogs = await matchingAiRepo.findSwipeScoreLogsByDog(dogId, 500);
    const totalSwipes = swipeLogs.length;
    const totalLikes = swipeLogs.filter((s) => s.direction === 'like').length;

    // Get match count
    const dogs = await dogRepo.findByOwner(userId);
    const dogIds = dogs.map((d) => d.id);
    const matches = await matchRepo.findActiveByDogIds(dogIds);
    const totalMatches = matches.length;
    const matchRate = totalLikes > 0 ? totalMatches / totalLikes : 0;

    // Get learned preferences
    const prefs = await matchingAiRepo.findUserPreferences(userId);
    const preferredDimensions = prefs
      ? [
          { dimension: 'size', weight: prefs.weightSize },
          { dimension: 'energy', weight: prefs.weightEnergy },
          { dimension: 'behavior', weight: prefs.weightBehavior },
          { dimension: 'walk', weight: prefs.weightWalk },
          { dimension: 'distance', weight: prefs.weightDistance },
          { dimension: 'leash', weight: prefs.weightLeash },
        ].sort((a, b) => b.weight - a.weight)
      : [];

    // Get optimal times
    const activityWindows = await matchingAiRepo.findActivityWindowsByUser(userId);
    const optimalTimes: OptimalTimeWindow[] = activityWindows.slice(0, 5).map((w) => ({
      dayOfWeek: w.dayOfWeek,
      hourOfDay: w.hourOfDay,
      score: Math.min(w.activityCount / 10, 1),
      nearbyActiveUsers: 0,
    }));

    // Get A/B variant
    const assignment = await matchingAiRepo.findAssignment(userId, EXPERIMENT.MATCHING_V2);
    const experimentVariant = assignment?.variant ?? null;

    return succeed({
      insights: {
        totalSwipes,
        totalLikes,
        totalMatches,
        matchRate: Math.round(matchRate * 100) / 100,
        preferredDimensions,
        optimalTimes,
        experimentVariant,
      },
    });
  };
}
