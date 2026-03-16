'use client';

import dynamic from 'next/dynamic';

const AbTestCharts = dynamic(() => import('./ab-test-charts').then((m) => m.AbTestCharts), {
  ssr: false,
});

export { AbTestCharts as LazyAbTestCharts };
