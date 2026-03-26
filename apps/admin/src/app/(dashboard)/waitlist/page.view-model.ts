import type { PaginatedResult } from '@pawmeet/types';
import type { SortingState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import type { WaitlistContact } from './actions';
import { fetchWaitlistContacts as fetchWaitlistAction } from './actions';

function getOrderDirection(isDesc: boolean): 'desc' | 'asc' {
  return isDesc ? 'desc' : 'asc';
}

export function useWaitlistViewModel(
  initialData: PaginatedResult<WaitlistContact>,
  initialSearch?: string,
) {
  const tt = useTranslations('toast');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialSearch ?? '');
  const [result, setResult] = useState<PaginatedResult<WaitlistContact>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const table = useDataTable({ totalItems: result.total, initialPageSize: 20 });

  // Track whether the user has interacted (changed search/sort/pagination)
  const isInitialRender = useRef(true);

  const fetchWaitlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstSort = sorting[0];
      const data = await fetchWaitlistAction({
        page: table.page,
        pageSize: table.pageSize,
        search: globalFilter || undefined,
        sortBy: firstSort?.id,
        sortOrder: firstSort ? getOrderDirection(firstSort.desc) : undefined,
      });
      setResult(data);
    } catch (error) {
      toast.error(handleError(error, tt('waitlist.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, globalFilter, sorting, tt]);

  useEffect(() => {
    // Skip the first render — we already have server data
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchWaitlist();
  }, [fetchWaitlist]);

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
    refetch: fetchWaitlist,
  };
}
