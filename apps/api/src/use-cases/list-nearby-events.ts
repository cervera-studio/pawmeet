import { type GroupEvent, type ParticipantStatus, type Result, succeed } from '@pawmeet/types';
import type {
  FollowRepository,
  GroupEventDiscoveryRepository,
  GroupEventParticipationRepository,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventDiscoveryRepository, 'findNearby'> &
    Pick<GroupEventParticipationRepository, 'findParticipantStatuses'>;
  followRepo: FollowRepository;
};

type ListNearbyEventsInput = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
  category?: 'walk' | 'meetup' | 'training';
};

type NearbyEventWithStatus = GroupEvent & {
  distanceKm: number;
  myStatus: ParticipantStatus | null;
};

export function createListNearbyEvents({ groupEventRepo, followRepo }: Deps) {
  return async (
    userId: string,
    input: ListNearbyEventsInput,
  ): Promise<Result<NearbyEventWithStatus[]>> => {
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

    // Batch-fetch user's participation status for all returned events
    const eventIds = events.map((e) => e.id);
    const statusMap =
      eventIds.length > 0
        ? await groupEventRepo.findParticipantStatuses(userId, eventIds)
        : new Map();

    const enriched: NearbyEventWithStatus[] = events.map((event) => ({
      ...event,
      myStatus: statusMap.get(event.id)?.status ?? null,
    }));

    return succeed(enriched);
  };
}
