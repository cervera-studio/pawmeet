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
import { formatNumber } from '@/lib/formatters';
import { LazyAbTestCharts } from './ab-test-charts-lazy';
import { AbTestFilters } from './ab-test-filters';
import { fetchExperimentMetrics, fetchFeatureFlags } from './actions';

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '\u2014';
  return `${(v * 100).toFixed(1)}%`;
}

function computeLift(control: number | null, treatment: number | null): string {
  if (control == null || treatment == null || control === 0) return '\u2014';
  return `${(((treatment - control) / control) * 100).toFixed(1)}%`;
}

interface AbTestsPageProps {
  searchParams: Promise<{
    experiment?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AbTestsPage({ searchParams }: AbTestsPageProps) {
  const params = await searchParams;
  const experimentName = params.experiment ?? 'ml_matching_v1';
  const dateFrom = params.dateFrom ?? '';
  const dateTo = params.dateTo ?? '';

  const [data, flags, t] = await Promise.all([
    fetchExperimentMetrics({
      experimentName,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    }),
    fetchFeatureFlags().catch(() => ({ flags: [] })),
    getTranslations('aiMatching.abTests'),
  ]);

  const experimentNames =
    flags.flags.length > 0 ? flags.flags.map((f) => f.name) : ['ml_matching_v1'];

  // Deduplicate and ensure the current experiment is included
  const uniqueExperiments = [...new Set([...experimentNames, experimentName])];

  const control = data.variants.find((v) => v.variant === 'control');
  const treatment = data.variants.find((v) => v.variant === 'treatment');
  const totalUsers = data.variants.reduce((sum, v) => sum + v.totalUsers, 0);

  // Derive the earliest date from time series data
  const earliestDate =
    data.timeSeries.length > 0
      // biome-ignore lint/style/noNonNullAssertion: length check above guarantees [0] exists
      ? new Date(data.timeSeries[0]!.date).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '\u2014';

  const controlWalkRate =
    control && control.totalMatches > 0 ? control.totalWalksCompleted / control.totalMatches : null;
  const treatmentWalkRate =
    treatment && treatment.totalMatches > 0
      ? treatment.totalWalksCompleted / treatment.totalMatches
      : null;

  const metrics = [
    {
      name: t('metricMatchRate'),
      control: fmtPct(control?.avgMatchRate),
      treatment: fmtPct(treatment?.avgMatchRate),
      lift: computeLift(control?.avgMatchRate ?? null, treatment?.avgMatchRate ?? null),
    },
    {
      name: t('metricAvgScore'),
      control: fmtPct(control?.avgCompatibilityScore),
      treatment: fmtPct(treatment?.avgCompatibilityScore),
      lift: computeLift(
        control?.avgCompatibilityScore ?? null,
        treatment?.avgCompatibilityScore ?? null,
      ),
    },
    {
      name: t('metricWalkCompletion'),
      control: fmtPct(controlWalkRate),
      treatment: fmtPct(treatmentWalkRate),
      lift: computeLift(controlWalkRate, treatmentWalkRate),
    },
    {
      name: t('metricAcceptRate'),
      control:
        control && control.totalMatches > 0
          ? (control.totalMessages / control.totalMatches).toFixed(1)
          : '\u2014',
      treatment:
        treatment && treatment.totalMatches > 0
          ? (treatment.totalMessages / treatment.totalMatches).toFixed(1)
          : '\u2014',
      lift: '\u2014',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <AbTestFilters
        experiments={uniqueExperiments}
        currentExperiment={experimentName}
        currentDateFrom={dateFrom}
        currentDateTo={dateTo}
      />

      {/* Experiment status banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{experimentName}</CardTitle>
              <CardDescription>{t('startedOn', { date: earliestDate })}</CardDescription>
            </div>
            <Badge variant="success">{t('statusRunning')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-neutral-500">{t('groupControl')}</p>
              <p className="text-lg font-semibold text-neutral-900">50%</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">{t('groupTreatment')}</p>
              <p className="text-lg font-semibold text-neutral-900">50%</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">{t('totalUsers')}</p>
              <p className="text-lg font-semibold text-neutral-900">{formatNumber(totalUsers)}</p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.name}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell>{metric.control}</TableCell>
                  <TableCell>{metric.treatment}</TableCell>
                  <TableCell>{metric.lift}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts (client component — recharts needs browser APIs) */}
      <LazyAbTestCharts data={data.timeSeries} />
    </div>
  );
}
