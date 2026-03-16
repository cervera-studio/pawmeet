'use client';

import dynamic from 'next/dynamic';

const PerformanceCharts = dynamic(
  () => import('./performance-charts').then((m) => m.PerformanceCharts),
  { ssr: false },
);

export { PerformanceCharts as LazyPerformanceCharts };
