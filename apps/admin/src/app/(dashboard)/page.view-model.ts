import { trpc } from '@/lib/trpc';

export function useDashboardViewModel() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

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
