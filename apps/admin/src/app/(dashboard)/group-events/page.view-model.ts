import type { PaginatedResult } from '@pawmeet/types';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import type { AdminGroupEventListItem, ListGroupEventsParams } from '@/repositories';
import { fetchGroupEvents } from './actions';

type EventStatus = NonNullable<ListGroupEventsParams['status']>;
type EventCategory = NonNullable<ListGroupEventsParams['category']>;

export function useGroupEventsViewModel(
  initialData: PaginatedResult<AdminGroupEventListItem>,
  pageSize: number,
) {
  const tt = useTranslations('toast');
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      status: statusFilter,
      category: categoryFilter,
    }),
    [statusFilter, categoryFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchGroupEvents,
    buildParams,
    errorMessage: tt('events.loadError'),
  });

  function handleStatusFilterChange(status: EventStatus | undefined) {
    setStatusFilter(status);
    paginated.resetPage();
  }

  function handleCategoryFilterChange(category: EventCategory | undefined) {
    setCategoryFilter(category);
    paginated.resetPage();
  }

  return {
    ...paginated,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    categoryFilter,
    setCategoryFilter: handleCategoryFilterChange,
  };
}
