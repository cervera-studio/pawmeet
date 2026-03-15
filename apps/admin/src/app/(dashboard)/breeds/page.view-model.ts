import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fetchBreeds } from './actions';

export type BreedsData = Awaited<ReturnType<typeof fetchBreeds>>;
export type Breed = BreedsData['data'][number];

export function useBreedsViewModel(initialData: BreedsData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchBreeds({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        group: groupFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[Breeds] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, groupFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleGroupFilterChange(group: string | undefined) {
    setGroupFilter(group);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value === '') {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }

  return {
    data: data.data,
    total: data.total,
    totalPages: Math.ceil(data.total / pagination.pageSize),
    isLoading,
    search,
    setSearch: handleSearchChange,
    groupFilter,
    setGroupFilter: handleGroupFilterChange,
    pagination,
    setPagination,
    refetch: fetchData,
  };
}
