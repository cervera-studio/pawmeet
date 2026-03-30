import type { RouterOutput } from '@pawmeet/api-client';
import { useCallback, useState } from 'react';
import { handleApiError } from '@/lib/error-handler';
import { api } from '@/lib/trpc';
import { useLocationStore } from '@/stores/location';

type NearbyUser = RouterOutput['users']['findNearby']['users'][number];

export function useNearbyUsers() {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordinates = useLocationStore((s) => s.coordinates);
  const searchRadiusKm = useLocationStore((s) => s.searchRadiusKm);

  const fetchNearby = useCallback(async () => {
    if (!coordinates) return;

    setLoading(true);
    setError(null);
    try {
      const { users: data } = await api.users.findNearby.query({
        radiusKm: searchRadiusKm,
      });
      setUsers(data);
    } catch (e) {
      setError(handleApiError(e, 'nearbyUsers').message);
    } finally {
      setLoading(false);
    }
  }, [coordinates, searchRadiusKm]);

  return {
    users,
    loading,
    error,
    fetchNearby,
  };
}
