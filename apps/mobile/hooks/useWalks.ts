import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/trpc';

type Walk = RouterOutput['walks']['listUpcoming']['walks'][number];

type ProposeWalkInput = {
  matchId: string;
  scheduledAt: string;
  durationMin?: number;
  title?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

export function useWalks() {
  const [upcomingWalks, setUpcomingWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const { walks } = await api.walks.listUpcoming.query();
      setUpcomingWalks(walks);
    } catch (e) {
      logger.warn('useWalks', 'Failed to fetch upcoming walks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  const proposeWalk = useCallback(
    async (input: ProposeWalkInput) => {
      const result = await api.walks.propose.mutate(input);
      await fetchUpcoming();
      return result;
    },
    [fetchUpcoming],
  );

  const respondToWalk = useCallback(
    async (walkId: string, accept: boolean) => {
      const result = await api.walks.respond.mutate({ walkId, accept });
      await fetchUpcoming();
      return result;
    },
    [fetchUpcoming],
  );

  const cancelWalk = useCallback(
    async (walkId: string) => {
      const result = await api.walks.cancel.mutate({ walkId });
      await fetchUpcoming();
      return result;
    },
    [fetchUpcoming],
  );

  const fetchByMatch = useCallback(async (matchId: string) => {
    try {
      const { walks } = await api.walks.listByMatch.query({ matchId });
      return walks;
    } catch (e) {
      logger.warn('useWalks', 'Failed to fetch walks for match', e);
      return [];
    }
  }, []);

  return {
    upcomingWalks,
    loading,
    fetchUpcoming,
    proposeWalk,
    respondToWalk,
    cancelWalk,
    fetchByMatch,
  };
}
