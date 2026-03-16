'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS } from '@/lib/constants';
import { formatDateAxis, formatDateShort } from '@/lib/formatters';

interface TimeSeriesEntry {
  date: string;
  variant: string;
  totalMatches: number;
  totalWalksCompleted: number;
  avgMatchRate: number | null;
}

export interface AbTestChartsProps {
  data: TimeSeriesEntry[];
}

function formatTooltipDate(v: unknown) {
  return formatDateShort(String(v));
}

function formatPercent(v: unknown) {
  return `${(Number(v) * 100).toFixed(1)}%`;
}

const AI_COLOR = '#3B82F6';
const CONTROL_COLOR = '#9CA3AF';

export function AbTestCharts({ data }: AbTestChartsProps) {
  const chartData = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        treatment_matchRate?: number;
        control_matchRate?: number;
        treatment_walkRate?: number;
        control_walkRate?: number;
      }
    >();

    for (const row of data) {
      const existing = byDate.get(row.date) ?? { date: row.date.split('T')[0] ?? row.date };
      const walkRate = row.totalMatches > 0 ? row.totalWalksCompleted / row.totalMatches : 0;

      if (row.variant === 'treatment') {
        existing.treatment_matchRate = row.avgMatchRate ?? undefined;
        existing.treatment_walkRate = walkRate;
      } else {
        existing.control_matchRate = row.avgMatchRate ?? undefined;
        existing.control_walkRate = walkRate;
      }

      byDate.set(row.date, existing);
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasso di accettazione match</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPercent} domain={[0, 'auto']} />
              <Tooltip labelFormatter={formatTooltipDate} formatter={formatPercent} />
              <Legend />
              <Line
                type="monotone"
                dataKey="treatment_matchRate"
                name="AI Matching"
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="control_matchRate"
                name="Controllo"
                stroke={CONTROL_COLOR}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasso di completamento passeggiate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPercent} domain={[0, 'auto']} />
              <Tooltip labelFormatter={formatTooltipDate} formatter={formatPercent} />
              <Legend />
              <Line
                type="monotone"
                dataKey="treatment_walkRate"
                name="AI Matching"
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="control_walkRate"
                name="Controllo"
                stroke={CONTROL_COLOR}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
