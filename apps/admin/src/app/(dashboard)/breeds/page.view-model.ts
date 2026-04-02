import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchBreeds } from './actions';

export type BreedsData = Awaited<ReturnType<typeof fetchBreeds>>;
export type Breed = BreedsData['data'][number];

export function useBreedsViewModel(initialData: BreedsData, pageSize: number) {
  const tt = useTranslations('toast');
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      group: groupFilter,
    }),
    [groupFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchBreeds,
    buildParams,
    errorMessage: tt('breeds.loadError'),
  });

  function handleGroupFilterChange(group: string | undefined) {
    setGroupFilter(group);
    paginated.resetPage();
  }

  return {
    ...paginated,
    groupFilter,
    setGroupFilter: handleGroupFilterChange,
  };
}
