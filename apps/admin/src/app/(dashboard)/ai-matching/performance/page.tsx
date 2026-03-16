import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/formatters';
import { fetchModelPerformance, fetchModelRegistry } from './actions';
import { ModelRegistryTable } from './model-registry-table';
import { LazyPerformanceCharts } from './performance-charts-lazy';

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtCount(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return formatNumber(value);
}

export default async function PerformancePage() {
  const [performance, registry, t] = await Promise.all([
    fetchModelPerformance(),
    fetchModelRegistry(),
    getTranslations('aiMatching.performance'),
  ]);

  const activeModel = registry.models.find((m: { isActive: boolean }) => m.isActive);

  const kpis = [
    { title: t('kpiPredictions'), value: fmtCount(performance.overview?.totalPredictions) },
    { title: t('kpiMatches'), value: fmtCount(performance.overview?.totalMatches) },
    { title: t('kpiAvgScore'), value: fmtPct(performance.overview?.avgOverallScore) },
    { title: 'Modello attivo', value: activeModel?.version ?? '\u2014' },
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

      {/* Charts */}
      <LazyPerformanceCharts
        scoreBuckets={
          performance.scoreBuckets as unknown as Parameters<
            typeof LazyPerformanceCharts
          >[0]['scoreBuckets']
        }
        weightDistribution={
          performance.weightDistribution as unknown as Parameters<
            typeof LazyPerformanceCharts
          >[0]['weightDistribution']
        }
        timeSeries={performance.timeSeries}
      />

      {/* Model Registry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelli registrati</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelRegistryTable
            models={
              registry.models as unknown as Parameters<typeof ModelRegistryTable>[0]['models']
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
