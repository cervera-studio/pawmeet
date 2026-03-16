'use client';

import dynamic from 'next/dynamic';
import type { AbTestChartsProps } from './ab-test-charts';

const AbTestCharts = dynamic(() => import('./ab-test-charts').then((m) => m.AbTestCharts), {
  ssr: false,
});

export function LazyAbTestCharts(props: AbTestChartsProps) {
  return <AbTestCharts {...props} />;
}
