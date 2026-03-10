import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type GroupEvent = RouterOutput['groupEvents']['listNearby'][number];
type GroupEventDetail = RouterOutput['groupEvents']['get'];

export type { GroupEvent, GroupEventDetail };

export function useGroupEvents() {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const listNearby = useCallback(async (latitude: number, longitude: number, radiusKm?: number) => {
    setLoading(true);
    try {
      const data = await api.groupEvents.listNearby.query({
        latitude,
        longitude,
        radiusKm: radiusKm ?? 10,
      });
      setEvents(data);
      return data;
    } catch (e) {
      logger.warn('useGroupEvents', 'Failed to fetch nearby events', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getEvent = useCallback(async (eventId: string) => {
    try {
      return await api.groupEvents.get.query({ eventId });
    } catch (e) {
      logger.warn('useGroupEvents', 'Failed to fetch event detail', e);
      return null;
    }
  }, []);

  const createEvent = useCallback(
    async (input: Parameters<typeof api.groupEvents.create.mutate>[0]) => {
      const result = await api.groupEvents.create.mutate(input);
      return result;
    },
    [],
  );

  const joinEvent = useCallback(async (eventId: string, dogId: string) => {
    const result = await api.groupEvents.join.mutate({ eventId, dogId });
    return result;
  }, []);

  const leaveEvent = useCallback(async (eventId: string) => {
    const result = await api.groupEvents.leave.mutate({ eventId });
    return result;
  }, []);

  const cancelEvent = useCallback(async (eventId: string) => {
    const result = await api.groupEvents.cancel.mutate({ eventId });
    return result;
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
  };
}
