import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

      {/* Chart placeholders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('chartCalibration')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              {t('chartPlaceholder')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('chartWeights')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              {t('chartPlaceholder')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('chartTimeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
            {t('chartPlaceholder')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
