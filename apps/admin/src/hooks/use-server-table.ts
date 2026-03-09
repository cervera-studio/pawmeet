'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  type SortingState,
  type PaginationState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UseServerTableOptions<T> {
  /** API endpoint path (e.g. "/admin/users") */
  endpoint: string;
  /** TanStack Query key prefix */
  queryKey: string;
  /** Default page size */
  pageSize?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useServerTable<T>({
  endpoint,
  queryKey,
  pageSize = 20,
}: UseServerTableOptions<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    };

    const firstSort = sorting[0];
    if (firstSort) {
      params.sortBy = firstSort.id;
      params.sortOrder = firstSort.desc ? 'desc' : 'asc';
    }

    if (globalFilter) {
      params.search = globalFilter;
    }

    columnFilters.forEach((filter) => {
      params[`filter_${filter.id}`] = filter.value as string;
    });

    return params;
  }, [sorting, pagination, columnFilters, globalFilter]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [queryKey, queryParams],
    queryFn: () =>
      api.get<PaginatedResponse<T>>(endpoint, { params: queryParams }),
  });

  const resetFilters = useCallback(() => {
    setColumnFilters([]);
    setGlobalFilter('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  return {
    // Data
    data: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    isError,
    error,
    refetch,

    // Table state
    sorting,
    setSorting,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,

    // Helpers
    resetFilters,
  };
}
