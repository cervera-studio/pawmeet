import type { PaginatedResult } from '@pawmeet/types';
import type { SortingState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
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

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => {
      const firstSort = sorting[0];
      return {
        page: ctx.page,
        pageSize: ctx.pageSize,
        search: ctx.search,
        sortBy: firstSort?.id,
        sortOrder: firstSort ? getOrderDirection(firstSort.desc) : undefined,
      };
    },
    [sorting],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize: 20,
    fetchFn: fetchWaitlistAction,
    buildParams,
    errorMessage: tt('waitlist.loadError'),
    initialSearch,
  });

  return {
    ...paginated,
    sorting,
    setSorting,
    globalFilter: paginated.search,
    setGlobalFilter: paginated.setSearch,
  };
}
