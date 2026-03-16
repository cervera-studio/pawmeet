import type {
  Achievement,
  ChallengeWithProgress,
  LeaderboardEntry,
  XpSummary,
} from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from 'tsyringe';
import { GAMIFICATION_REPOSITORY } from '@/repositories/tokens';

const repo = container.resolve(GAMIFICATION_REPOSITORY);

export function useXpSummary() {
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchXpSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.getXpSummary();
      setXpSummary(data);
      return data;
    } catch (e) {
      logger.warn('useXpSummary', 'Failed to fetch XP summary', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { xpSummary, loading, fetchXpSummary };
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'weekly' | 'allTime'>('weekly');

  const fetchLeaderboard = useCallback(
    async (t?: 'weekly' | 'allTime', limit?: number) => {
      setLoading(true);
      try {
        const data = await repo.getLeaderboard(t ?? type, limit);
        setEntries(data);
        return data;
      } catch (e) {
        logger.warn('useLeaderboard', 'Failed to fetch leaderboard', e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  const changeType = useCallback(
    (newType: 'weekly' | 'allTime') => {
      setType(newType);
      void fetchLeaderboard(newType);
    },
    [fetchLeaderboard],
  );

  return { entries, loading, type, fetchLeaderboard, changeType };
}

export function useChallenges() {
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.listActiveChallenges();
      setChallenges(data);
      return data;
    } catch (e) {
      logger.warn('useChallenges', 'Failed to fetch challenges', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { challenges, loading, fetchChallenges };
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.listAchievements();
      setAchievements(data);
      return data;
    } catch (e) {
      logger.warn('useAchievements', 'Failed to fetch achievements', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { achievements, loading, fetchAchievements };
}
