import type { WalkSuggestion } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from '@/repositories/container';
import { SMART_MATCHING_REPOSITORY } from '@/repositories/tokens';

export type { WalkSuggestion };

const repo = container.resolve(SMART_MATCHING_REPOSITORY);

export function useWalkSuggestions() {
  const [suggestions, setSuggestions] = useState<WalkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async (dogId: string, limit?: number) => {
    setLoading(true);
    try {
      const result = await repo.suggestWalks(dogId, limit);
      setSuggestions(result.suggestions);
    } catch (e) {
      logger.warn('useWalkSuggestions', 'Failed to fetch walk suggestions', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggestions, loading, fetchSuggestions };
}
