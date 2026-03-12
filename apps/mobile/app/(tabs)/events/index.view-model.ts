import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useLocation } from '@/hooks/useLocation';

type NearbyEvent = RouterOutput['groupEvents']['listNearby'][number];

export type { NearbyEvent };

export function useEventDiscoveryViewModel() {
  const router = useRouter();
  const { events, loading, listNearby } = useGroupEvents();
  const { coordinates, getCurrentLocation } = useLocation();

  const refresh = useCallback(async () => {
    let coords = coordinates;
    if (!coords) {
      coords = await getCurrentLocation();
    }
    if (coords) {
      await listNearby(coords.latitude, coords.longitude);
    }
  }, [coordinates, getCurrentLocation, listNearby]);

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
    refresh,
    navigateToEvent,
    navigateToCreate,
  };
}
