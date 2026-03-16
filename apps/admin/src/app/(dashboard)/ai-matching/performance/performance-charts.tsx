'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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

// -- Mock: Calibration data (predicted vs observed) --
const calibrationData = [
  { bucket: '0-10%', predicted: 5, observed: 4.2 },
  { bucket: '10-20%', predicted: 15, observed: 13.8 },
  { bucket: '20-30%', predicted: 25, observed: 22.5 },
  { bucket: '30-40%', predicted: 35, observed: 33.1 },
  { bucket: '40-50%', predicted: 45, observed: 43.7 },
  { bucket: '50-60%', predicted: 55, observed: 56.2 },
  { bucket: '60-70%', predicted: 65, observed: 67.8 },
  { bucket: '70-80%', predicted: 75, observed: 74.1 },
  { bucket: '80-90%', predicted: 85, observed: 82.6 },
  { bucket: '90-100%', predicted: 95, observed: 91.3 },
];

// -- Mock: Weight distribution --
const weightData = [
  { dimension: 'Taglia', weight: 25, color: '#3B82F6' },
  { dimension: 'Energia', weight: 25, color: '#10B981' },
  { dimension: 'Comportamento', weight: 20, color: '#F59E0B' },
  { dimension: 'Passeggiata', weight: 15, color: '#8B5CF6' },
  { dimension: 'Distanza', weight: 10, color: '#EF4444' },
  { dimension: 'Guinzaglio', weight: 5, color: '#6B7280' },
];

// -- Mock: Performance time series (30 days) --
function generatePerformanceTimeSeries() {
  const data = [];
  const baseDate = new Date('2026-02-14');
  let avgScore = 0.62;
  let matchRate = 0.35;

  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    avgScore += (Math.random() - 0.4) * 0.015;
    matchRate += (Math.random() - 0.4) * 0.01;

    data.push({
      date: date.toISOString().split('T')[0],
      avgScore: Math.round(Math.max(0.5, Math.min(0.85, avgScore)) * 100) / 100,
      matchRate: Math.round(Math.max(0.2, Math.min(0.6, matchRate)) * 100) / 100,
    });
  }
  return data;
}

const performanceTimeSeries = generatePerformanceTimeSeries();

const AI_COLOR = '#3B82F6';

function formatPercent(v: unknown) {
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function formatTooltipDate(v: unknown) {
  return formatDateShort(String(v));
}

export function CalibrationChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibrazione modello</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <ComposedChart data={calibrationData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Bar
              dataKey="observed"
              name="Tasso osservato"
              fill={AI_COLOR}
              radius={[4, 4, 0, 0]}
              fillOpacity={0.7}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Ideale"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function WeightDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuzione pesi</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={weightData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 30]} />
            <YAxis dataKey="dimension" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip formatter={(v: unknown) => `${v}%`} />
            <Bar dataKey="weight" name="Peso" fill={AI_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PerformanceTimeSeries() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Andamento prestazioni</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={performanceTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickFormatter={formatPercent}
              domain={[0.4, 0.9]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={formatPercent}
              domain={[0.1, 0.7]}
            />
            <Tooltip labelFormatter={formatTooltipDate} formatter={formatPercent} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgScore"
              name="Score medio"
              stroke={AI_COLOR}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="matchRate"
              name="Tasso match"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PerformanceCharts() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <CalibrationChart />
        <WeightDistributionChart />
      </div>
      <PerformanceTimeSeries />
    </>
  );
}
