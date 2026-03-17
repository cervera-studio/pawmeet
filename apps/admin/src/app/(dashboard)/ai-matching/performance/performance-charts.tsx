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
import { CHART_COLORS } from '@/lib/constants';
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibrazione modello</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <EmptyState message="Nessun dato di calibrazione disponibile." />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar
                dataKey="observedMatchRate"
                name="Tasso osservato"
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuzione pesi</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <EmptyState message="Nessun dato sui pesi disponibile." />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 'auto']} />
              <YAxis dataKey="dimension" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
              <Bar dataKey="avgWeight" name="Peso medio" fill={AI_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceTimeSeries({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Andamento prestazioni</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="Nessun dato storico disponibile." />
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={formatPercent}
                domain={[0, 1]}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={formatTooltipDate} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgOverallScore"
                name="Score medio"
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                yAxisId="right"
                dataKey="totalPredictions"
                name="Predizioni"
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
