import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { TIMING } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface UsePaginatedDataOptions<TData, TParams> {
  initialData: PaginatedResponse<TData>;
  pageSize: number;
  fetchFn: (params: TParams) => Promise<PaginatedResponse<TData>>;
  buildParams: (ctx: { page: number; pageSize: number; search: string | undefined }) => TParams;
  errorMessage: string;
  enableSearch?: boolean;
  initialSearch?: string;
}

export interface UsePaginatedDataReturn<TData> {
  data: TData[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  refetch: () => Promise<void>;
  resetPage: () => void;
}

export function usePaginatedData<TData, TParams>({
  initialData,
  pageSize,
  fetchFn,
  buildParams,
  errorMessage,
  enableSearch = true,
  initialSearch = '',
}: UsePaginatedDataOptions<TData, TParams>): UsePaginatedDataReturn<TData> {
  const [search, setSearchRaw] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search, TIMING.DEBOUNCE_DELAY_MS);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildParams({
        page: table.page,
        pageSize: table.pageSize,
        search: (enableSearch && debouncedSearch) || undefined,
      });
      const result = await fetchFn(params);
      setData(result);
    } catch (error) {
      toast.error(handleError(error, errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [
    table.page,
    table.pageSize,
    debouncedSearch,
    buildParams,
    fetchFn,
    errorMessage,
    enableSearch,
  ]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleSearchChange(value: string) {
    setSearchRaw(value);
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
    pagination: table.pagination,
    setPagination: table.setPagination,
    refetch: fetchData,
    resetPage: () => table.onPageChange(0),
  };
}
