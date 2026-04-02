import type { DogSizeCategory } from '@pawmeet/config';
import { BREED_ACTIVITY_GOALS, DOG_SIZE } from '@pawmeet/config';
import type { HealthGoal, Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { ActivityRepository } from '../ports/activity-repository.js';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  activityRepo: ActivityRepository;
};

/** Map dog size values to the health config size categories */
const SIZE_MAP: Record<string, DogSizeCategory> = {
  [DOG_SIZE.TOY]: DOG_SIZE.TOY,
  [DOG_SIZE.SMALL]: DOG_SIZE.SMALL,
  [DOG_SIZE.MEDIUM]: DOG_SIZE.MEDIUM,
  [DOG_SIZE.LARGE]: DOG_SIZE.LARGE,
  [DOG_SIZE.GIANT]: DOG_SIZE.GIANT,
};

export function createGetDogHealthGoal({ dogRepo, activityRepo }: Deps) {
  return async (
    userId: string,
    input: { dogId: string },
  ): Promise<Result<{ goal: HealthGoal }>> => {
    const dog = await dogRepo.findById(input.dogId);

    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog not found', 404));
    }

    if (dog.ownerId !== userId) {
      return fail(new AppError('DOG_NOT_OWNED', ERROR_MESSAGES.DOG_NOT_OWNED, 403));
    }

    const sizeCategory = SIZE_MAP[dog.size] ?? DOG_SIZE.MEDIUM;
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
