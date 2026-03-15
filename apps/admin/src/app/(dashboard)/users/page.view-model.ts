import type { PaginatedResult } from '@pawmeet/types';
import type { SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import type { AdminUserListItem } from '@/repositories';
import { fetchUsers as fetchUsersAction } from './actions';

export function useUsersViewModel(initialData: PaginatedResult<AdminUserListItem>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [result, setResult] = useState<PaginatedResult<AdminUserListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const table = useDataTable({ totalItems: result.total, initialPageSize: 20 });

  // Track whether the user has interacted (changed search/sort/pagination)
  const isInitialRender = useRef(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstSort = sorting[0];
      const data = await fetchUsersAction({
        page: table.page,
        pageSize: table.pageSize,
        search: globalFilter || undefined,
        sortBy: firstSort?.id,
        sortOrder: firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined,
      });
      setResult(data);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento degli utenti'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, globalFilter, sorting]);

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
    totalPages: table.totalPages,
    isLoading,
    sorting,
    setSorting,
    pagination: table.pagination,
    setPagination: table.setPagination,
    globalFilter,
    setGlobalFilter,
  };
}
