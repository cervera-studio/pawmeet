'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FitnessStats {
  totalWalks: number;
  avgDistanceKm: number;
  totalDistanceKm: number;
  topWalkers: { userId: string; displayName: string | null; totalKm: number }[];
}

interface FitnessStatsViewProps {
  stats: FitnessStats;
}

export function FitnessStatsView({ stats }: FitnessStatsViewProps) {
  const t = useTranslations('fitness');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('stats.totalWalks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
              {stats.totalWalks.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('stats.totalDistanceKm')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
              {stats.totalDistanceKm.toLocaleString('it-IT')} km
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('stats.avgDistanceKm')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
              {stats.avgDistanceKm.toLocaleString('it-IT')} km
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Walkers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.topWalkers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topWalkers.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('stats.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('stats.user')}</TableHead>
                  <TableHead className="text-right">{t('stats.distanceKm')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topWalkers.map((walker, index) => (
                  <TableRow key={walker.userId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{walker.displayName ?? t('stats.unknownUser')}</TableCell>
                    <TableCell className="text-right">
                      {walker.totalKm.toLocaleString('it-IT')} km
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
