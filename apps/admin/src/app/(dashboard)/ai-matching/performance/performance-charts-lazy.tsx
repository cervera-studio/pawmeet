'use client';

import dynamic from 'next/dynamic';
import type { PerformanceChartsProps } from './performance-charts';

const PerformanceCharts = dynamic(
  () => import('./performance-charts').then((m) => m.PerformanceCharts),
  { ssr: false },
);

export function LazyPerformanceCharts(props: PerformanceChartsProps) {
  return <PerformanceCharts {...props} />;
}
