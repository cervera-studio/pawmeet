import type { PaginatedResult } from '@dogwalk/types';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminUserListItem } from '@/repositories';
import { fetchUsers as fetchUsersAction } from './actions';

export function useUsersViewModel(initialData: PaginatedResult<AdminUserListItem>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [result, setResult] = useState<PaginatedResult<AdminUserListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Track whether the user has interacted (changed search/sort/pagination)
  const isInitialRender = useRef(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstSort = sorting[0];
      const data = await fetchUsersAction({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        sortBy: firstSort?.id,
        sortOrder: firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined,
      });
      setResult(data);
    } catch (error) {
      console.error('[Users] Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, sorting]);

  useEffect(() => {
    // Skip the first render — we already have server data
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchUsers();
  }, [fetchUsers]);

  return {
    data: result.data,
    total: result.total,
    totalPages: Math.ceil(result.total / pagination.pageSize),
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
  };
}
