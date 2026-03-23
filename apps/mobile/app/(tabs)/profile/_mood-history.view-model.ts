import type { MoodLog, Serialized } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { container } from 'tsyringe';
import { isValidUUID } from '@/lib/deep-link-validation';
import { MOOD_LOG_REPOSITORY } from '@/repositories/tokens';

const repo = container.resolve(MOOD_LOG_REPOSITORY);

export function useMoodHistoryViewModel() {
  const params = useLocalSearchParams<{ dogId: string }>();
  const validDogId = params.dogId && isValidUUID(params.dogId) ? params.dogId : undefined;

  const [logs, setLogs] = useState<Serialized<MoodLog>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(
    async (cursor?: string | null) => {
      if (!validDogId) return;
      try {
        const result = await repo.listByDog(validDogId, cursor, 50);
        if (cursor) {
          setLogs((prev) => [...prev, ...result.logs]);
        } else {
          setLogs(result.logs);
        }
        setNextCursor(result.nextCursor);
      } catch (e) {
        logger.warn('MoodHistory', 'Failed to fetch mood logs', e);
      }
    },
    [validDogId],
  );

  const initialFetch = useCallback(async () => {
    setLoading(true);
    await fetchLogs(null);
    setLoading(false);
  }, [fetchLogs]);

  useEffect(() => {
    void initialFetch();
  }, [initialFetch]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs(null);
    setRefreshing(false);
  }, [fetchLogs]);

  const loadMore = useCallback(async () => {
    if (nextCursor) {
      await fetchLogs(nextCursor);
    }
  }, [nextCursor, fetchLogs]);

  return {
    logs,
    loading,
    refreshing,
    hasMore: nextCursor != null,
    dogId: validDogId,
    refresh,
    loadMore,
  };
}
