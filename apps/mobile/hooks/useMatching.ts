import type { RouterOutput } from '@dogwalk/api-client';
import type { DiscoveryFilters } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cache } from '@/lib/storage';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type Suggestion = RouterOutput['matches']['discover']['suggestions'][number];
type LikeResult = RouterOutput['matches']['like'];

const SUGGESTIONS_CACHE_KEY = 'cache:suggestions';

/**
 * Matching hook that reads the active dog from the store.
 * Re-fetches suggestions whenever selectedDogId changes.
 */
export function useMatching() {
  const dogId = useDogsStore((s) => s.selectedDogId);
  const cacheKey = dogId ? `${SUGGESTIONS_CACHE_KEY}:${dogId}` : SUGGESTIONS_CACHE_KEY;

  // Hydrate from cache on init (stale-while-revalidate)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    () => cache.get<Suggestion[]>(cacheKey) ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<LikeResult | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({});

  // Reset suggestions when the active dog changes
  const prevDogIdRef = useRef(dogId);
  useEffect(() => {
    if (dogId && dogId !== prevDogIdRef.current) {
      prevDogIdRef.current = dogId;
      const cached = cache.get<Suggestion[]>(cacheKey) ?? [];
      setSuggestions(cached);
      setCurrentIndex(0);
    }
  }, [dogId, cacheKey]);

  const currentProfile = suggestions[currentIndex] ?? null;
  const hasMore = currentIndex < suggestions.length;

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && (!Array.isArray(v) || v.length > 0),
  ).length;

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const hasFilters = Object.keys(filters).length > 0;
      const { suggestions: data } = await api.matches.discover.query({
        dogId: dogId ?? '',
        ...(hasFilters ? { filters } : {}),
      });
      setSuggestions(data);
      setCurrentIndex(0);
      cache.set(cacheKey, data);
    } catch (e) {
      logger.warn('useMatching', 'Failed to fetch suggestions', e);
    } finally {
      setIsLoading(false);
    }
  }, [dogId, cacheKey, filters]);

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const swipeRight = useCallback(
    async (targetDogId: string) => {
      try {
        const result = await api.matches.like.mutate({
          dogId: dogId ?? '',
          targetDogId,
        });
        if (result.isMatch) {
          setNewMatch(result);
        }
      } catch (e) {
        logger.warn('useMatching', 'swipeRight failed', e);
      }
      advanceCard();
    },
    [advanceCard, dogId],
  );

  const swipeLeft = useCallback(
    async (targetDogId: string) => {
      try {
        await api.matches.pass.mutate({ dogId: dogId ?? '', targetDogId });
      } catch (e) {
        logger.warn('useMatching', 'swipeLeft failed', e);
      }
      advanceCard();
    },
    [advanceCard, dogId],
  );

  const superLike = useCallback(
    async (targetDogId: string) => {
      try {
        const result = await api.matches.like.mutate({
          dogId: dogId ?? '',
          targetDogId,
        });
        if (result.isMatch) {
          setNewMatch(result);
        }
      } catch (e) {
        logger.warn('useMatching', 'superLike failed', e);
      }
      advanceCard();
    },
    [advanceCard, dogId],
  );

  const dismissMatch = useCallback(() => {
    setNewMatch(null);
  }, []);

  return {
    currentProfile,
    suggestions,
    isLoading,
    hasMore,
    newMatch,
    filters,
    activeFilterCount,
    setFilters,
    fetchSuggestions,
    swipeRight,
    swipeLeft,
    superLike,
    dismissMatch,
  };
}
