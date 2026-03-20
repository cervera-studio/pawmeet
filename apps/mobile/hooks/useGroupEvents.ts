import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from '@/repositories/container';
import type { CreateGroupEventInput } from '@/repositories/interfaces/group-event-repository';
import { GROUP_EVENT_REPOSITORY } from '@/repositories/tokens';

type GroupEvent = RouterOutput['groupEvents']['listNearby'][number];
type GroupEventDetail = RouterOutput['groupEvents']['get'];
type PendingRequest = RouterOutput['groupEvents']['listPendingRequests'][number];

export type { GroupEvent, GroupEventDetail };

const groupEventRepo = container.resolve(GROUP_EVENT_REPOSITORY);

export function useGroupEvents() {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const listNearby = useCallback(
    async (
      latitude: number,
      longitude: number,
      radiusKm?: number,
      category?: 'walk' | 'meetup' | 'training',
    ) => {
      setLoading(true);
      try {
        const data = await groupEventRepo.listNearby({
          latitude,
          longitude,
          radiusKm: radiusKm ?? 10,
          ...(category ? { category } : {}),
        });
        setEvents(data as GroupEvent[]);
        return data;
      } catch (e) {
        logger.warn('useGroupEvents', 'Failed to fetch nearby events', e);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getEvent = useCallback(async (eventId: string) => {
    try {
      return await groupEventRepo.getById(eventId);
    } catch (e) {
      logger.warn('useGroupEvents', 'Failed to fetch event detail', e);
      return null;
    }
  }, []);

  const createEvent = useCallback(async (input: CreateGroupEventInput) => {
    const result = await groupEventRepo.create(input);
    return result;
  }, []);

  const joinEvent = useCallback(async (eventId: string, dogId: string) => {
    await groupEventRepo.join(eventId, dogId);
  }, []);

  const leaveEvent = useCallback(async (eventId: string) => {
    await groupEventRepo.leave(eventId);
  }, []);

  const cancelEvent = useCallback(async (eventId: string) => {
    await groupEventRepo.cancel(eventId);
  }, []);

  const listPendingRequests = useCallback(
    async (eventId: string): Promise<PendingRequest[]> => {
      try {
        return (await groupEventRepo.listPendingRequests(eventId)) as PendingRequest[];
      } catch (e) {
        logger.warn('useGroupEvents', 'Failed to fetch pending requests', e);
        return [];
      }
    },
    [],
  );

  const approveParticipant = useCallback(async (eventId: string, userId: string) => {
    await groupEventRepo.approveParticipant(eventId, userId);
  }, []);

  const declineParticipant = useCallback(async (eventId: string, userId: string) => {
    await groupEventRepo.declineParticipant(eventId, userId);
  }, []);

  return {
    events,
    loading,
    listNearby,
    getEvent,
    createEvent,
    joinEvent,
    leaveEvent,
    cancelEvent,
    listPendingRequests,
    approveParticipant,
    declineParticipant,
  };
}
