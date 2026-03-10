'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardViewModel } from './page.view-model';

export default function DashboardPage() {
  const vm = useDashboardViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Panoramica delle metriche principali</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vm.kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {vm.isLoading ? (
                <div className="h-8 w-20 animate-pulse rounded bg-neutral-100" />
              ) : (
                <div className="text-2xl font-bold text-neutral-900">
                  {kpi.value.toLocaleString('it-IT')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrazioni Utenti (ultimi 30 giorni)</CardTitle>
          </CardHeader>
          <CardContent>
            {!vm.hasUserRegistrations ? (
              <div className="flex h-64 items-center justify-center text-neutral-400">
                Caricamento...
              </div>
            ) : vm.userRegistrationsEmpty ? (
              <div className="flex h-64 items-center justify-center text-neutral-400">
                Nessun dato disponibile
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={vm.userRegistrationsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) =>
                      new Date(String(v)).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
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
            {!vm.hasDailyMatches ? (
              <div className="flex h-64 items-center justify-center text-neutral-400">
                Caricamento...
              </div>
            ) : vm.dailyMatchesEmpty ? (
              <div className="flex h-64 items-center justify-center text-neutral-400">
                Nessun dato disponibile
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={vm.dailyMatchesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) =>
                      new Date(String(v)).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
                  <Bar dataKey="count" name="Match" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
