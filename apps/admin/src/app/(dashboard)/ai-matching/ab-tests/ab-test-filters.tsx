'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface AbTestFiltersProps {
  experiments: string[];
  currentExperiment: string;
  currentDateFrom: string;
  currentDateTo: string;
}

export function AbTestFilters({
  experiments,
  currentExperiment,
  currentDateFrom,
  currentDateTo,
}: AbTestFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('aiMatching.abTests');

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="experiment-select" className="mb-1 block text-sm font-medium">
          {t('experiment')}
        </label>
        <select
          id="experiment-select"
          className="h-9 rounded-md border border-neutral-200 bg-surface px-3 text-sm"
          value={currentExperiment}
          onChange={(e) => updateParams('experiment', e.target.value)}
        >
          {experiments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="date-from" className="mb-1 block text-sm font-medium">
          {t('dateFrom')}
        </label>
        <Input
          id="date-from"
          type="date"
          value={currentDateFrom}
          onChange={(e) => updateParams('dateFrom', e.target.value)}
          className="h-9 w-40"
        />
      </div>
      <div>
        <label htmlFor="date-to" className="mb-1 block text-sm font-medium">
          {t('dateTo')}
        </label>
        <Input
          id="date-to"
          type="date"
          value={currentDateTo}
          onChange={(e) => updateParams('dateTo', e.target.value)}
          className="h-9 w-40"
        />
      </div>
    </div>
  );
}
