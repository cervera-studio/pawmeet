import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type ActivityStats = RouterOutput['fitness']['getStats'];
type HealthGoal = RouterOutput['fitness']['getDogGoal'];

export function useActivityStats() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [healthGoal, setHealthGoal] = useState<HealthGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const fetchStats = useCallback(
    async (p?: 'week' | 'month') => {
      setLoading(true);
      try {
        const data = await api.fitness.getStats.query({ period: p ?? period });
        setStats(data);
        return data;
      } catch (e) {
        logger.warn('useActivityStats', 'Failed to fetch stats', e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  const fetchHealthGoal = useCallback(async (dogId: string) => {
    try {
      const data = await api.fitness.getDogGoal.query({ dogId });
      setHealthGoal(data);
      return data;
    } catch (e) {
      logger.warn('useActivityStats', 'Failed to fetch health goal', e);
      return null;
    }
  }, []);

  const changePeriod = useCallback(
    (newPeriod: 'week' | 'month') => {
      setPeriod(newPeriod);
      void fetchStats(newPeriod);
    },
    [fetchStats],
  );

  return {
    stats,
    healthGoal,
    loading,
    period,
    fetchStats,
    fetchHealthGoal,
    changePeriod,
  };
}
