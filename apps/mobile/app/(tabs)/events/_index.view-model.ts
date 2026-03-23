import type { RouterOutput } from '@pawmeet/api-client';
import type { GroupEventCategory } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useLocation } from '@/hooks/useLocation';
import { container } from '@/repositories/container';
import type { FeaturedEvent } from '@/repositories/interfaces';
import { GROUP_EVENT_REPOSITORY } from '@/repositories/tokens';

type NearbyEvent = RouterOutput['groupEvents']['listNearby'][number];

export type { NearbyEvent };

export function useEventDiscoveryViewModel() {
  const router = useRouter();
  const { events, loading, listNearby } = useGroupEvents();
  const { coordinates, getCurrentLocation } = useLocation();
  const [category, setCategory] = useState<GroupEventCategory | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const groupEventRepo = useMemo(() => container.resolve(GROUP_EVENT_REPOSITORY), []);

  const loadFeatured = useCallback(async () => {
    try {
      const result = await groupEventRepo.listFeatured(1, 10);
      setFeaturedEvents(result);
    } catch (e) {
      logger.warn('EventDiscovery', 'Failed to load featured events', e);
    }
  }, [groupEventRepo]);

  const refresh = useCallback(async () => {
    let coords = coordinates;
    if (!coords) {
      coords = await getCurrentLocation();
    }
    if (coords) {
      await listNearby(coords.latitude, coords.longitude, undefined, category ?? undefined);
    }
    await loadFeatured();
  }, [coordinates, getCurrentLocation, listNearby, category, loadFeatured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const navigateToEvent = (eventId: string) => {
    router.push(`/(tabs)/events/${eventId}`);
  };

  const navigateToCreate = () => {
    router.push('/(tabs)/events/create');
  };

  const navigateToCalendar = () => {
    router.push('/(tabs)/events/calendar');
  };

  const isInitialLoad = loading && events.length === 0;

  return {
    events,
    featuredEvents,
    loading,
    isInitialLoad,
    category,
    setCategory,
    refresh,
    navigateToEvent,
    navigateToCreate,
    navigateToCalendar,
  };
}
