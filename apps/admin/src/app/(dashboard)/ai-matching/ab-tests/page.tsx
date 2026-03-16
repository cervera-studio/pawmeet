import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function AbTestsPage() {
  const t = await getTranslations('aiMatching.abTests');

  const experiment = {
    name: 'ML Matching vs Rule-Based',
    status: 'running' as const,
    startDate: '2026-03-10',
    groups: { control: 50, treatment: 50 },
    totalUsers: 0,
  };

  const metrics = [
    {
      name: t('metricMatchRate'),
      control: '—',
      treatment: '—',
      lift: '—',
      pValue: '—',
    },
    {
      name: t('metricAcceptRate'),
      control: '—',
      treatment: '—',
      lift: '—',
      pValue: '—',
    },
    {
      name: t('metricAvgScore'),
      control: '—',
      treatment: '—',
      lift: '—',
      pValue: '—',
    },
    {
      name: t('metricWalkCompletion'),
      control: '—',
      treatment: '—',
      lift: '—',
      pValue: '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      {/* Experiment status banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{experiment.name}</CardTitle>
              <CardDescription>{t('startedOn', { date: experiment.startDate })}</CardDescription>
            </div>
            <Badge variant="success">{t('statusRunning')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('groupControl')}</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {experiment.groups.control}%
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('groupTreatment')}
              </p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {experiment.groups.treatment}%
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('totalUsers')}</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {experiment.totalUsers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('metricsTitle')}</CardTitle>
          <CardDescription>{t('metricsSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columnMetric')}</TableHead>
                <TableHead>{t('columnControl')}</TableHead>
                <TableHead>{t('columnTreatment')}</TableHead>
                <TableHead>{t('columnLift')}</TableHead>
                <TableHead>{t('columnPValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.name}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell>{metric.control}</TableCell>
                  <TableCell>{metric.treatment}</TableCell>
                  <TableCell>{metric.lift}</TableCell>
                  <TableCell>{metric.pValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart placeholders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('chartMatchRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              {t('chartPlaceholder')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('chartAcceptRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              {t('chartPlaceholder')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
