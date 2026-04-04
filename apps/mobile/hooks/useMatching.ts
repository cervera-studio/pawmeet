import type { RouterOutput } from '@pawmeet/api-client';
import type { DiscoveryFilters } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { cache } from '@/lib/storage';
import { container } from '@/repositories/container';
import { MATCH_REPOSITORY } from '@/repositories/tokens';
import { useDogsStore } from '@/stores/dogs';

type Suggestion = RouterOutput['matches']['discover']['suggestions'][number];
type LikeResult = RouterOutput['matches']['like'];

const SUGGESTIONS_CACHE_KEY = 'cache:suggestions';

const matchRepo = container.resolve(MATCH_REPOSITORY);

/**
 * Matching hook that reads the active dog from the store.
 * Re-fetches suggestions whenever selectedDogId changes.
 */
export function useMatching() {
  const analytics = useAnalyticsService();
  const dogId = useDogsStore((s) => s.selectedDogId);
  const swipeCountRef = useRef(0);
  const cardViewStartRef = useRef<number>(Date.now());
  const cacheKey = dogId ? `${SUGGESTIONS_CACHE_KEY}:${dogId}` : SUGGESTIONS_CACHE_KEY;

  // Hydrate from cache on init (stale-while-revalidate)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    () => cache.get<Suggestion[]>(cacheKey) ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<LikeResult | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const swipedIdsRef = useRef(new Set<string>());

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
  const nextProfile = suggestions[currentIndex + 1] ?? null;
  const hasMore = currentIndex < suggestions.length;

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && (!Array.isArray(v) || v.length > 0),
  ).length;

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const hasFilters = Object.keys(filters).length > 0;
      const { suggestions: rawData } = await matchRepo.discover(
        dogId ?? '',
        hasFilters ? filters : undefined,
      );
      const data = (rawData as Suggestion[]).filter((s) => !swipedIdsRef.current.has(s.dog.id));
      setSuggestions(data);
      setCurrentIndex(0);
      swipeCountRef.current = 0;
      cache.set(cacheKey, data);

      // Track match feed loaded
      const avgScore =
        data.length > 0
          ? data.reduce((sum, s) => sum + (s.compatibilityScore ?? 0), 0) / data.length
          : 0;
      analytics.track('match_feed_loaded', {
        cardsAvailable: data.length,
        avgCompatibilityScore: Math.round(avgScore * 100) / 100,
      });
    } catch (e) {
      logger.warn('useMatching', 'Failed to fetch suggestions', e);
    } finally {
      setIsLoading(false);
    }
  }, [dogId, cacheKey, filters, analytics]);

  const advanceCard = useCallback(() => {
    swipeCountRef.current += 1;
    cardViewStartRef.current = Date.now();
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= suggestions.length) {
        analytics.track('match_feed_exhausted', {
          totalSwipesSession: swipeCountRef.current,
          searchRadiusKm: filters.maxDistanceKm ?? 50,
        });
      }
      return next;
    });
  }, [suggestions.length, filters, analytics]);

  const trackSwipe = useCallback(
    (direction: 'right' | 'left') => {
      analytics.track('match_swipe_performed', {
        direction,
        compatibilityScore: currentProfile?.compatibilityScore ?? 0,
        distanceKm: currentProfile?.distanceKm ?? 0,
        viewDurationMs: Date.now() - cardViewStartRef.current,
        sizePair: currentProfile?.dog.size ?? 'unknown',
        energyPair: currentProfile?.dog.energyLevel ?? 'unknown',
      });
    },
    [currentProfile, analytics],
  );

  const swipeRight = useCallback(
    async (targetDogId: string) => {
      swipedIdsRef.current.add(targetDogId);
      trackSwipe('right');
      try {
        const result = await matchRepo.like(dogId ?? '', targetDogId);
        if (result.isMatch) {
          setNewMatch(result as LikeResult);
        }
      } catch (e) {
        logger.warn('useMatching', 'swipeRight failed', e);
      }
      advanceCard();
    },
    [advanceCard, dogId, trackSwipe],
  );

  const swipeLeft = useCallback(
    async (targetDogId: string) => {
      swipedIdsRef.current.add(targetDogId);
      trackSwipe('left');
      try {
        await matchRepo.pass(dogId ?? '', targetDogId);
      } catch (e) {
        logger.warn('useMatching', 'swipeLeft failed', e);
      }
      advanceCard();
    },
    [advanceCard, dogId, trackSwipe],
  );

  const superLike = useCallback(
    async (targetDogId: string) => {
      swipedIdsRef.current.add(targetDogId);
      try {
        const result = await matchRepo.like(dogId ?? '', targetDogId);
        if (result.isMatch) {
          setNewMatch(result as LikeResult);
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
    nextProfile,
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
