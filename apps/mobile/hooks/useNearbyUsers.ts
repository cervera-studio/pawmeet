import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useLocationStore } from '@/stores/location';

export interface NearbyUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  distanceKm: number;
  latitude: number;
  longitude: number;
  dogs: {
    id: string;
    name: string;
    breed: string;
    size: string;
    energyLevel: string;
    avatarUrl: string | null;
  }[];
}

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
      const data = await api.get<NearbyUser[]>(
        `/users/nearby?lat=${coordinates.latitude}&lng=${coordinates.longitude}&radiusKm=${searchRadiusKm}`,
      );
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento');
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
