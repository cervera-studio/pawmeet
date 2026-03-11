import type { PaginatedResult } from '@dogwalk/types';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { type AdminUserListItem, userRepository } from '@/repositories';

export function useUsersViewModel() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [result, setResult] = useState<PaginatedResult<AdminUserListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstSort = sorting[0];
      const data = await userRepository.list({
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
    void fetchUsers();
  }, [fetchUsers]);

  return {
    data: result?.data ?? [],
    total: result?.total ?? 0,
    totalPages: result ? Math.ceil(result.total / pagination.pageSize) : 0,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
  };
}
