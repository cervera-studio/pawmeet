import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { container } from '@/repositories/container';
import type { ProposeWalkInput } from '@/repositories/interfaces/walk-repository';
import { WALK_REPOSITORY } from '@/repositories/tokens';

type Walk = RouterOutput['walks']['listUpcoming']['walks'][number];

const walkRepo = container.resolve(WALK_REPOSITORY);

export function useWalks() {
  const [upcomingWalks, setUpcomingWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const { walks } = await walkRepo.listUpcoming();
      setUpcomingWalks(walks as Walk[]);
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
      const result = await walkRepo.propose(input);
      await fetchUpcoming();
      return result;
    },
    [fetchUpcoming],
  );

  const respondToWalk = useCallback(
    async (walkId: string, accept: boolean) => {
      await walkRepo.respond(walkId, accept);
      await fetchUpcoming();
    },
    [fetchUpcoming],
  );

  const cancelWalk = useCallback(
    async (walkId: string) => {
      await walkRepo.cancel(walkId);
      await fetchUpcoming();
    },
    [fetchUpcoming],
  );

  const fetchByMatch = useCallback(async (matchId: string) => {
    try {
      const { walks } = await walkRepo.listByMatch(matchId);
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
