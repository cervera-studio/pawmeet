import type { DogSizeCategory } from '@pawmeet/config';
import { BREED_ACTIVITY_GOALS } from '@pawmeet/config';
import type { HealthGoal, Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { ActivityRepository } from '../ports/activity-repository.js';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  activityRepo: ActivityRepository;
};

/** Map dog size values to the health config size categories */
const SIZE_MAP: Record<string, DogSizeCategory> = {
  toy: 'toy',
  small: 'small',
  medium: 'medium',
  large: 'large',
  giant: 'giant',
};

export function createGetDogHealthGoal({ dogRepo, activityRepo }: Deps) {
  return async (
    userId: string,
    input: { dogId: string },
  ): Promise<Result<{ goal: HealthGoal }>> => {
    const dog = await dogRepo.findById(input.dogId);

    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Cane non trovato', 404));
    }

    if (dog.ownerId !== userId) {
      return fail(new AppError('DOG_NOT_OWNED', 'Non hai i permessi per questo cane', 403));
    }

    const sizeCategory = SIZE_MAP[dog.size] ?? 'medium';
    const recommendedDailyMinutes = BREED_ACTIVITY_GOALS[sizeCategory];

    // Get last 7 days of activity to compute current daily average
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const from = weekAgo.toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const history = await activityRepo.getDailyHistory(userId, from, to);
    const totalMin = history.reduce((sum, d) => sum + d.walkDurationMin, 0);
    const currentDailyAvgMinutes = Math.round(totalMin / 7);

    const goalProgress =
      recommendedDailyMinutes > 0
        ? Math.min(currentDailyAvgMinutes / recommendedDailyMinutes, 1)
        : 0;

    return succeed({
      goal: {
        recommendedDailyMinutes,
        sizeCategory,
        currentDailyAvgMinutes,
        goalProgress: Math.round(goalProgress * 100) / 100,
      },
    });
  };
}
