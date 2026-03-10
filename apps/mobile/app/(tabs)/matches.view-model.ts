import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type EnrichedMatch = RouterOutput['matches']['list']['matches'][number];

export type { EnrichedMatch };

export function useMatchesViewModel() {
  const router = useRouter();
  const dogs = useDogsStore((s) => s.dogs);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  // null = show all dogs' matches
  const [filterDogId, setFilterDogId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const { matches: data } = await api.matches.list.query();
      setMatches(data);
    } catch (e) {
      logger.warn('MatchesScreen', 'Failed to fetch matches', e);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Helper to find dog name by id
  const dogNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const dog of dogs) {
      map.set(dog.id, dog.name);
    }
    return map;
  }, [dogs]);

  // Filter matches by selected dog (if multi-dog)
  const filteredMatches = useMemo(() => {
    if (!filterDogId) return matches;
    return matches.filter((m) => m.dogId === filterDogId);
  }, [matches, filterDogId]);

  const hasMultipleDogs = dogs.length > 1;

  const renderItem = useCallback(
    ({ item }: { item: EnrichedMatch }) => ({
      item,
      hasMultipleDogs,
      myDogName: hasMultipleDogs ? dogNameById.get(item.dogId) : undefined,
    }),
    [hasMultipleDogs, dogNameById],
  );

  const navigateToChat = useCallback(
    (matchId: string) => {
      router.push(`/(tabs)/chat/${matchId}`);
    },
    [router],
  );

  const navigateToDiscover = useCallback(() => {
    router.push('/(tabs)/');
  }, [router]);

  // Show skeleton only on initial load
  const isInitialLoad = loading && !hasLoaded;

  return {
    dogs,
    filteredMatches,
    loading,
    isInitialLoad,
    filterDogId,
    setFilterDogId,
    hasMultipleDogs,
    dogNameById,
    fetchMatches,
    navigateToChat,
    navigateToDiscover,
  };
}
