'use client';

import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(
  () => import('./dashboard-charts').then((m) => m.DashboardCharts),
  { ssr: false },
);

export { DashboardCharts as LazyDashboardCharts };
