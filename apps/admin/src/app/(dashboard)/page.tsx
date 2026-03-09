import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const kpiCards = [
  {
    title: 'Utenti Totali',
    value: '12,847',
    change: '+12.5%',
    changeType: 'positive' as const,
    description: 'rispetto al mese scorso',
  },
  {
    title: 'Match Totali',
    value: '34,291',
    change: '+8.2%',
    changeType: 'positive' as const,
    description: 'rispetto al mese scorso',
  },
  {
    title: 'MAU',
    value: '6,423',
    change: '-2.1%',
    changeType: 'negative' as const,
    description: 'rispetto al mese scorso',
  },
  {
    title: 'Revenue',
    value: '\u20ac18,420',
    change: '+15.3%',
    changeType: 'positive' as const,
    description: 'rispetto al mese scorso',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Panoramica delle metriche principali</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900">{kpi.value}</div>
              <p className="mt-1 text-xs">
                <span
                  className={
                    kpi.changeType === 'positive'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {kpi.change}
                </span>{' '}
                <span className="text-neutral-500">{kpi.description}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder charts area */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrazioni Utenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-neutral-400">
              {/* TODO: Recharts line chart */}
              Grafico registrazioni (placeholder)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Giornalieri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-neutral-400">
              {/* TODO: Recharts bar chart */}
              Grafico match (placeholder)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
