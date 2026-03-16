import type { RouterOutput } from '@pawmeet/api-client';
import type { GroupEventCategory } from '@pawmeet/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useLocation } from '@/hooks/useLocation';

type NearbyEvent = RouterOutput['groupEvents']['listNearby'][number];

export type { NearbyEvent };

export function useEventDiscoveryViewModel() {
  const router = useRouter();
  const { events, loading, listNearby } = useGroupEvents();
  const { coordinates, getCurrentLocation } = useLocation();
  const [category, setCategory] = useState<GroupEventCategory | null>(null);

  const refresh = useCallback(async () => {
    let coords = coordinates;
    if (!coords) {
      coords = await getCurrentLocation();
    }
    if (coords) {
      await listNearby(coords.latitude, coords.longitude, undefined, category ?? undefined);
    }
  }, [coordinates, getCurrentLocation, listNearby, category]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const navigateToEvent = (eventId: string) => {
    router.push(`/(tabs)/events/${eventId}`);
  };

  const navigateToCreate = () => {
    router.push('/(tabs)/events/create');
  };

  const isInitialLoad = loading && events.length === 0;

  return {
    events,
    loading,
    isInitialLoad,
    category,
    setCategory,
    refresh,
    navigateToEvent,
    navigateToCreate,
  };
}
