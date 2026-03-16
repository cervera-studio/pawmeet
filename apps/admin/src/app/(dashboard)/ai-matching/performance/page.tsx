import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LazyPerformanceCharts } from './performance-charts-lazy';

export default async function PerformancePage() {
  const t = await getTranslations('aiMatching.performance');

  const kpis = [
    { title: t('kpiPredictions'), value: '—' },
    { title: t('kpiMatches'), value: '—' },
    { title: t('kpiAccuracy'), value: '—' },
    { title: t('kpiAvgScore'), value: '—' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts (client component — recharts needs browser APIs) */}
      <LazyPerformanceCharts />
    </div>
  );
}
