import { type GroupEvent, type Result, succeed } from '@dogwalk/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

type ListNearbyEventsInput = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
};

export function createListNearbyEvents({ groupEventRepo }: Deps) {
  return async (
    userId: string,
    input: ListNearbyEventsInput,
  ): Promise<Result<(GroupEvent & { distanceKm: number })[]>> => {
    const events = await groupEventRepo.findNearby({
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      limit: input.limit,
      excludeUserId: userId,
    });
    return succeed(events);
  };
}
