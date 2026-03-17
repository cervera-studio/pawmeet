import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { TIMING } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { fetchBreeds } from './actions';

export type BreedsData = Awaited<ReturnType<typeof fetchBreeds>>;
export type Breed = BreedsData['data'][number];

export function useBreedsViewModel(initialData: BreedsData, pageSize: number) {
  const tt = useTranslations('toast');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, TIMING.DEBOUNCE_DELAY_MS);
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchBreeds({
        page: table.page,
        pageSize: table.pageSize,
        search: debouncedSearch || undefined,
        group: groupFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, tt('breeds.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, groupFilter, tt]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleGroupFilterChange(group: string | undefined) {
    setGroupFilter(group);
    table.onPageChange(0);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value === '') {
      table.onPageChange(0);
    }
  }

  return {
    data: data.data,
    total: data.total,
    totalPages: table.totalPages,
    isLoading,
    search,
    setSearch: handleSearchChange,
    groupFilter,
    setGroupFilter: handleGroupFilterChange,
    pagination: table.pagination,
    setPagination: table.setPagination,
    refetch: fetchData,
  };
}
