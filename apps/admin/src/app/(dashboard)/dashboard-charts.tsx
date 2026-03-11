'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateAxis, formatDateShort } from '@/lib/formatters';
import type { TimeSeriesPoint } from '@/repositories';

interface DashboardChartsProps {
  userRegistrations: TimeSeriesPoint[];
  dailyMatches: TimeSeriesPoint[];
  dauTimeSeries: TimeSeriesPoint[];
}

function formatDateTooltip(v: unknown) {
  return formatDateShort(String(v));
}

export function DashboardCharts({
  userRegistrations,
  dailyMatches,
  dauTimeSeries,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrazioni Utenti (ultimi 30 giorni)</CardTitle>
        </CardHeader>
        <CardContent>
          {userRegistrations.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              Nessun dato disponibile
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={userRegistrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={formatDateTooltip} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Registrazioni"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Giornalieri (ultimi 30 giorni)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyMatches.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              Nessun dato disponibile
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={dailyMatches}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={formatDateTooltip} />
                <Bar dataKey="count" name="Match" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            DAU — Utenti Attivi Giornalieri (ultimi 30 giorni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dauTimeSeries.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              Nessun dato disponibile
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={dauTimeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={formatDateTooltip} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="DAU"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
