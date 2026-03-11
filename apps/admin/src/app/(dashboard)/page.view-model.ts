import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/lib/auth-store';
import { type AnalyticsKpis, type DashboardStats, statsRepository } from '@/repositories';

export function useDashboardViewModel() {
  const { isAuthenticated } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsKpis, setAnalyticsKpis] = useState<AnalyticsKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, kpis] = await Promise.all([
        statsRepository.getStats(),
        statsRepository.getAnalyticsKpis(),
      ]);
      setStats(data);
      setAnalyticsKpis(kpis);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void fetchStats();
  }, [fetchStats, isAuthenticated]);

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

  const analyticsCards = [
    {
      title: 'DAU (Oggi)',
      value: analyticsKpis?.dauToday ?? 0,
    },
    {
      title: 'Registrazioni Oggi',
      value: analyticsKpis?.registrationsToday ?? 0,
    },
    {
      title: 'Match Oggi',
      value: analyticsKpis?.matchesToday ?? 0,
    },
    {
      title: 'Eventi Ultimi 24h',
      value: analyticsKpis?.eventsLast24h ?? 0,
    },
    {
      title: 'Eventi Totali',
      value: analyticsKpis?.totalEvents ?? 0,
    },
  ];

  const hasUserRegistrations = !isLoading && stats?.userRegistrations;
  const userRegistrationsEmpty = hasUserRegistrations && stats.userRegistrations.length === 0;
  const userRegistrationsData = hasUserRegistrations ? stats.userRegistrations : [];

  const hasDailyMatches = !isLoading && stats?.dailyMatches;
  const dailyMatchesEmpty = hasDailyMatches && stats.dailyMatches.length === 0;
  const dailyMatchesData = hasDailyMatches ? stats.dailyMatches : [];

  const hasDauTimeSeries = !isLoading && analyticsKpis?.dauTimeSeries;
  const dauTimeSeriesEmpty = hasDauTimeSeries && analyticsKpis.dauTimeSeries.length === 0;
  const dauTimeSeriesData = hasDauTimeSeries ? analyticsKpis.dauTimeSeries : [];

  return {
    isLoading,
    kpiCards,
    analyticsCards,
    hasUserRegistrations,
    userRegistrationsEmpty,
    userRegistrationsData,
    hasDailyMatches,
    dailyMatchesEmpty,
    dailyMatchesData,
    hasDauTimeSeries,
    dauTimeSeriesEmpty,
    dauTimeSeriesData,
  };
}
