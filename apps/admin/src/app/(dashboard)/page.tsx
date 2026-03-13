import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/formatters';
import { getServerTrpcClient } from '@/lib/server-api';

const DashboardCharts = dynamic(() =>
  import('./dashboard-charts').then((m) => m.DashboardCharts),
  { ssr: false },
);

export default async function DashboardPage() {
  const api = await getServerTrpcClient();

  const [stats, analyticsKpis] = await Promise.all([
    api.admin.getStats.query(),
    api.admin.getAnalyticsKpis.query(),
  ]);

  const kpiCards = [
    { title: 'Utenti Totali', value: stats.totalUsers },
    { title: 'Cani Registrati', value: stats.totalDogs },
    { title: 'Match Attivi', value: stats.activeMatches },
    { title: 'Foto in Attesa', value: stats.pendingPhotos },
    { title: 'Segnalazioni Pendenti', value: stats.pendingReports },
    { title: 'Match Totali', value: stats.totalMatches },
  ];

  const analyticsCards = [
    { title: 'DAU (Oggi)', value: analyticsKpis.dauToday },
    { title: 'Registrazioni Oggi', value: analyticsKpis.registrationsToday },
    { title: 'Match Oggi', value: analyticsKpis.matchesToday },
    { title: 'Eventi Ultimi 24h', value: analyticsKpis.eventsLast24h },
    { title: 'Eventi Totali', value: analyticsKpis.totalEvents },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Panoramica delle metriche principali</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900">{formatNumber(kpi.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics KPI Cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-800">Analytics (Real-time)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {analyticsCards.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">{kpi.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neutral-900">{formatNumber(kpi.value)}</div>
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
