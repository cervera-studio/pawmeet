import { MAX_OPTIMAL_TIME_WINDOWS, MIN_ACTIVITY_COUNT_FOR_WINDOW } from '@pawmeet/config';
import type { OptimalTimeWindow } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository, MatchingAiRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
  dogRepo: DogRepository;
};

export function createGetOptimalTimes({ matchingAiRepo, dogRepo }: Deps) {
  return async (
    userId: string,
    dogId: string,
    limit?: number,
  ): Promise<Result<{ windows: OptimalTimeWindow[] }>> => {
    const effectiveLimit = limit ?? MAX_OPTIMAL_TIME_WINDOWS;

    // Verify dog ownership
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    // Get user's own activity windows
    const userWindows = await matchingAiRepo.findActivityWindowsByUser(userId);

    if (userWindows.length === 0) {
      return succeed({ windows: [] });
    }

    // For each of the user's top activity windows, check how many other users
    // are also active at that time
    const results: OptimalTimeWindow[] = [];

    for (const window of userWindows.slice(0, effectiveLimit * 2)) {
      if (window.activityCount < MIN_ACTIVITY_COUNT_FOR_WINDOW) continue;

      const nearby = await matchingAiRepo.findNearbyActivityWindows(
        userId,
        window.dayOfWeek,
        window.hourOfDay,
      );

      const nearbyActiveUsers = nearby.length;

      // Score: combination of user's own activity + nearby activity
      const userScore = Math.min(window.activityCount / 10, 1);
      const nearbyScore = Math.min(nearbyActiveUsers / 5, 1);
      const score = Math.round((userScore * 0.3 + nearbyScore * 0.7) * 100) / 100;

      results.push({
        dayOfWeek: window.dayOfWeek,
        hourOfDay: window.hourOfDay,
        score,
        nearbyActiveUsers,
      });
    }

    // Sort by score descending and take top N
    results.sort((a, b) => b.score - a.score);

    return succeed({ windows: results.slice(0, effectiveLimit) });
  };
}
