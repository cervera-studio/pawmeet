import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export interface MatchSuggestion {
  id: string;
  dogId: string;
  name: string;
  breed: string;
  age: string;
  size: string;
  energyLevel: string;
  ownerName: string;
  distanceKm: number;
  compatibilityScore: number;
  imageUrl: string | null;
}

export interface MatchResult {
  id: string;
  dogName: string;
  ownerName: string;
  breed: string;
  compatibilityScore: number;
  status: 'nuovo' | 'in_chat' | 'incontrato';
  matchedAt: string;
  imageUrl: string | null;
}

interface MatchResponse {
  matched: boolean;
  matchId?: string;
}

export function useMatching() {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<MatchResponse | null>(null);

  const currentProfile = suggestions[currentIndex] ?? null;
  const hasMore = currentIndex < suggestions.length;

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<MatchSuggestion[]>('/matches/suggestions');
      setSuggestions(data);
      setCurrentIndex(0);
    } catch {
      // Silently fail, will show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const swipeRight = useCallback(
    async (dogId: string) => {
      try {
        const result = await api.post<MatchResponse>('/matches/like', { dogId });
        if (result.matched) {
          setNewMatch(result);
        }
      } catch {
        // Silently fail
      }
      advanceCard();
    },
    [advanceCard],
  );

  const swipeLeft = useCallback(
    async (dogId: string) => {
      try {
        await api.post('/matches/dislike', { dogId });
      } catch {
        // Silently fail
      }
      advanceCard();
    },
    [advanceCard],
  );

  const superLike = useCallback(
    async (dogId: string) => {
      try {
        const result = await api.post<MatchResponse>('/matches/superlike', { dogId });
        if (result.matched) {
          setNewMatch(result);
        }
      } catch {
        // Silently fail
      }
      advanceCard();
    },
    [advanceCard],
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
