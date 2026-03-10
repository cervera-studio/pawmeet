import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type Suggestion = RouterOutput['matches']['discover']['suggestions'][number];
type LikeResult = RouterOutput['matches']['like'];

export function useMatching(dogId?: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<LikeResult | null>(null);

  const currentProfile = suggestions[currentIndex] ?? null;
  const hasMore = currentIndex < suggestions.length;

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { suggestions: data } = await api.matches.discover.query({ dogId: dogId ?? '' });
      setSuggestions(data);
      setCurrentIndex(0);
    } catch (e) {
      logger.warn('useMatching', 'Failed to fetch suggestions', e);
    } finally {
      setIsLoading(false);
    }
  }, [dogId]);

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
    fetchSuggestions,
    swipeRight,
    swipeLeft,
    superLike,
    dismissMatch,
  };
}
