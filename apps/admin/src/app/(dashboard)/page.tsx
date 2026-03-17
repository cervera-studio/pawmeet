import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/formatters';
import { fetchAnalyticsKpis, fetchDashboardStats } from './actions';
import { LazyDashboardCharts as DashboardCharts } from './dashboard-charts-lazy';

export default async function DashboardPage() {
  const [stats, analyticsKpis, t] = await Promise.all([
    fetchDashboardStats(),
    fetchAnalyticsKpis(),
    getTranslations('dashboard'),
  ]);

  const kpiCards = [
    { title: t('totalUsers'), value: stats.totalUsers },
    { title: t('registeredDogs'), value: stats.totalDogs },
    { title: t('activeMatches'), value: stats.activeMatches },
    { title: t('pendingPhotos'), value: stats.pendingPhotos },
    { title: t('pendingReports'), value: stats.pendingReports },
    { title: t('totalMatches'), value: stats.totalMatches },
  ];

  const analyticsCards = [
    { title: t('dauToday'), value: analyticsKpis.dauToday },
    { title: t('registrationsToday'), value: analyticsKpis.registrationsToday },
    { title: t('matchesToday'), value: analyticsKpis.matchesToday },
    { title: t('eventsLast24h'), value: analyticsKpis.eventsLast24h },
    { title: t('totalEvents'), value: analyticsKpis.totalEvents },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900">
                {formatNumber(kpi.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics KPI Cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-700">
          {t('analyticsRealtime')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {analyticsCards.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  {kpi.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatNumber(kpi.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts (client component — recharts needs browser APIs) */}
      <DashboardCharts
        userRegistrations={stats.userRegistrations}
        dailyMatches={stats.dailyMatches}
        dauTimeSeries={analyticsKpis.dauTimeSeries}
      />
    </div>
  );
}
