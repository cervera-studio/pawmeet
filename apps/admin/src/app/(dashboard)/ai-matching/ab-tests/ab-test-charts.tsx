'use client';

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

// Mock data: 30 giorni di metriche A/B test
function generateMockData() {
  const data = [];
  const baseDate = new Date('2026-03-10');
  let aiAcceptance = 0.42;
  let controlAcceptance = 0.38;
  let aiCompletion = 0.71;
  let controlCompletion = 0.65;

  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    aiAcceptance += (Math.random() - 0.4) * 0.02;
    controlAcceptance += (Math.random() - 0.5) * 0.015;
    aiCompletion += (Math.random() - 0.4) * 0.015;
    controlCompletion += (Math.random() - 0.5) * 0.01;

    data.push({
      date: date.toISOString().split('T')[0],
      aiAcceptance: Math.round(Math.max(0.3, Math.min(0.65, aiAcceptance)) * 100) / 100,
      controlAcceptance: Math.round(Math.max(0.25, Math.min(0.55, controlAcceptance)) * 100) / 100,
      aiCompletion: Math.round(Math.max(0.55, Math.min(0.9, aiCompletion)) * 100) / 100,
      controlCompletion: Math.round(Math.max(0.5, Math.min(0.8, controlCompletion)) * 100) / 100,
    });
  }
  return data;
}

const mockData = generateMockData();

function formatTooltipDate(v: unknown) {
  return formatDateShort(String(v));
}

function formatPercent(v: unknown) {
  return `${(Number(v) * 100).toFixed(1)}%`;
}

const AI_COLOR = '#3B82F6';
const CONTROL_COLOR = '#9CA3AF';

export function AbTestCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasso di accettazione match</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPercent} domain={[0.2, 0.7]} />
              <Tooltip labelFormatter={formatTooltipDate} formatter={formatPercent} />
              <Legend />
              <Line
                type="monotone"
                dataKey="aiAcceptance"
                name="AI Matching"
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="controlAcceptance"
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
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPercent} domain={[0.4, 0.95]} />
              <Tooltip labelFormatter={formatTooltipDate} formatter={formatPercent} />
              <Legend />
              <Line
                type="monotone"
                dataKey="aiCompletion"
                name="AI Matching"
                stroke={AI_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="controlCompletion"
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
