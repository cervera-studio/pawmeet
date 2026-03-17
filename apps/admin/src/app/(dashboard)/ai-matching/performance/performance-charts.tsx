'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsDark } from '@/hooks/use-is-dark';
import { FONT_SIZE, getChartColors } from '@/lib/constants';
import { formatDateAxis, formatDateShort } from '@/lib/formatters';

// ── Types ────────────────────────────────────────────────────────────────────

interface ScoreBucket {
  bucket: string;
  observedMatchRate: number;
}

interface WeightDimension {
  dimension: string;
  avgWeight: number;
}

interface TimeSeriesPoint {
  date: string;
  totalPredictions: number;
  totalMatches: number;
  avgOverallScore: number | null;
}

export interface PerformanceChartsProps {
  scoreBuckets: ScoreBucket[] | null;
  weightDistribution: WeightDimension[] | null;
  timeSeries: TimeSeriesPoint[];
}

// ── Labels (Italian) — move to i18n when available ───────────────────────────

const CHART_LABELS = {
  calibrationTitle: 'Calibrazione modello',
  calibrationEmpty: 'Nessun dato di calibrazione disponibile.',
  observedRate: 'Tasso osservato',
  weightTitle: 'Distribuzione pesi',
  weightEmpty: 'Nessun dato sui pesi disponibile.',
  avgWeight: 'Peso medio',
  timeSeriesTitle: 'Andamento prestazioni',
  timeSeriesEmpty: 'Nessun dato storico disponibile.',
  avgScore: 'Score medio',
  predictions: 'Predizioni',
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

const AI_COLOR = '#3B82F6';

function formatPercent(v: unknown) {
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function formatTooltipDate(v: unknown) {
  return formatDateShort(String(v));
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

// ── Charts ───────────────────────────────────────────────────────────────────

function CalibrationChart({ data }: { data: ScoreBucket[] | null }) {
  const chartColors = getChartColors(useIsDark());
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{CHART_LABELS.calibrationTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <EmptyState message={CHART_LABELS.calibrationEmpty} />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="bucket" tick={{ fontSize: FONT_SIZE.xs }} />
              <YAxis tick={{ fontSize: FONT_SIZE.sm }} unit="%" />
              <Tooltip />
              <Bar
                dataKey="observedMatchRate"
                name={CHART_LABELS.observedRate}
                fill={AI_COLOR}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.7}
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function WeightDistributionChart({ data }: { data: WeightDimension[] | null }) {
  const chartColors = getChartColors(useIsDark());
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{CHART_LABELS.weightTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <EmptyState message={CHART_LABELS.weightEmpty} />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" tick={{ fontSize: FONT_SIZE.sm }} unit="%" domain={[0, 'auto']} />
              <YAxis dataKey="dimension" type="category" tick={{ fontSize: FONT_SIZE.sm }} width={100} />
              <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
              <Bar
                dataKey="avgWeight"
                name={CHART_LABELS.avgWeight}
                fill={AI_COLOR}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceTimeSeries({ data }: { data: TimeSeriesPoint[] }) {
  const chartColors = getChartColors(useIsDark());
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{CHART_LABELS.timeSeriesTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message={CHART_LABELS.timeSeriesEmpty} />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="date" tick={{ fontSize: FONT_SIZE.sm }} tickFormatter={formatDateAxis} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: FONT_SIZE.sm }}
                tickFormatter={formatPercent}
                domain={[0, 1]}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: FONT_SIZE.sm }} />
              <Tooltip labelFormatter={formatTooltipDate} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgOverallScore"
                name={CHART_LABELS.avgScore}
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                yAxisId="right"
                dataKey="totalPredictions"
                name={CHART_LABELS.predictions}
                fill="#10B981"
                fillOpacity={0.4}
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PerformanceCharts({
  scoreBuckets,
  weightDistribution,
  timeSeries,
}: PerformanceChartsProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <CalibrationChart data={scoreBuckets} />
        <WeightDistributionChart data={weightDistribution} />
      </div>
      <PerformanceTimeSeries data={timeSeries} />
    </>
  );
}
