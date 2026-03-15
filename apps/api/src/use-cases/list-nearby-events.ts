import { type GroupEvent, type Result, succeed } from '@pawmeet/types';
import type { FollowRepository, GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
  followRepo: FollowRepository;
};

type ListNearbyEventsInput = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
  category?: 'walk' | 'meetup' | 'training';
};

export function createListNearbyEvents({ groupEventRepo, followRepo }: Deps) {
  return async (
    userId: string,
    input: ListNearbyEventsInput,
  ): Promise<Result<(GroupEvent & { distanceKm: number })[]>> => {
    // Fetch friend IDs for friends_only visibility filtering
    const friends = await followRepo.listFriends(userId, { limit: 1000, offset: 0 });
    const friendUserIds = friends.map((f) => f.id);

    const events = await groupEventRepo.findNearby({
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      limit: input.limit,
      excludeUserId: userId,
      friendUserIds,
      category: input.category,
    });
    return succeed(events);
  };
}
