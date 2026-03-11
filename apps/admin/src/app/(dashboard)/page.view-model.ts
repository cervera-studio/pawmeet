import { useCallback, useEffect, useState } from 'react';
import { type DashboardStats, statsRepository } from '@/repositories';

export function useDashboardViewModel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await statsRepository.getStats();
      setStats(data);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const kpiCards = [
    {
      title: 'Utenti Totali',
      value: stats?.totalUsers ?? 0,
    },
    {
      title: 'Cani Registrati',
      value: stats?.totalDogs ?? 0,
    },
    {
      title: 'Match Attivi',
      value: stats?.activeMatches ?? 0,
    },
    {
      title: 'Foto in Attesa',
      value: stats?.pendingPhotos ?? 0,
    },
    {
      title: 'Segnalazioni Pendenti',
      value: stats?.pendingReports ?? 0,
    },
    {
      title: 'Match Totali',
      value: stats?.totalMatches ?? 0,
    },
  ];

  const hasUserRegistrations = !isLoading && stats?.userRegistrations;
  const userRegistrationsEmpty = hasUserRegistrations && stats.userRegistrations.length === 0;
  const userRegistrationsData = hasUserRegistrations ? stats.userRegistrations : [];

  const hasDailyMatches = !isLoading && stats?.dailyMatches;
  const dailyMatchesEmpty = hasDailyMatches && stats.dailyMatches.length === 0;
  const dailyMatchesData = hasDailyMatches ? stats.dailyMatches : [];

  return {
    isLoading,
    kpiCards,
    hasUserRegistrations,
    userRegistrationsEmpty,
    userRegistrationsData,
    hasDailyMatches,
    dailyMatchesEmpty,
    dailyMatchesData,
  };
}
