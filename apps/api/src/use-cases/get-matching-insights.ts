import { STATSIG_GATE } from '@pawmeet/config';
import type { MatchingInsights, OptimalTimeWindow } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type {
  DogRepository,
  ExperimentService,
  MatchingAiRepository,
  MatchRepository,
} from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
  experimentService: ExperimentService;
};

export function createGetMatchingInsights({
  matchingAiRepo,
  matchRepo,
  dogRepo,
  experimentService,
}: Deps) {
  return async (userId: string, dogId: string): Promise<Result<{ insights: MatchingInsights }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    // Get swipe history stats
    const { logs: swipeLogs } = await matchingAiRepo.findSwipeScoreLogsByDog(dogId, { limit: 500 });
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

    // Get A/B variant via Statsig
    const useAi = await experimentService.checkGate(userId, STATSIG_GATE.AI_MATCHING);
    const experimentVariant = useAi ? 'ai_enhanced' : 'rule_based';

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
