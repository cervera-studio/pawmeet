import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import { fetchBreeds } from './actions';

export type BreedsData = Awaited<ReturnType<typeof fetchBreeds>>;
export type Breed = BreedsData['data'][number];

export function useBreedsViewModel(initialData: BreedsData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
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
      toast.error(handleError(error, 'Errore nel caricamento delle razze'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, groupFilter]);

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
