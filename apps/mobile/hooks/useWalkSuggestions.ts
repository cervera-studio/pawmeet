import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type SuggestWalksResult = RouterOutput['matchingAi']['suggestWalks'];
export type WalkSuggestion = SuggestWalksResult['suggestions'][number];

export function useWalkSuggestions() {
  const [suggestions, setSuggestions] = useState<WalkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async (dogId: string, limit?: number) => {
    setLoading(true);
    try {
      const result = await api.matchingAi.suggestWalks.query({ dogId, limit });
      setSuggestions(result.suggestions);
    } catch (e) {
      logger.warn('useWalkSuggestions', 'Failed to fetch walk suggestions', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggestions, loading, fetchSuggestions };
}
