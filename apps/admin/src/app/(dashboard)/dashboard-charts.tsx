'use client';

import { useTranslations } from 'next-intl';
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

export interface DashboardChartsProps {
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
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('chartRegistrations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {userRegistrations.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              {tc('noData')}
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
                  name={t('registrationsLabel')}
                  stroke="#065F46"
                  fill="#059669"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('chartDailyMatches')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyMatches.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              {tc('noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={dailyMatches}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateAxis} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={formatDateTooltip} />
                <Bar dataKey="count" name={t('matchLabel')} fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t('chartDau')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dauTimeSeries.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-neutral-400">
              {tc('noData')}
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
                  name={t('dauLabel')}
                  stroke="#10B981"
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
