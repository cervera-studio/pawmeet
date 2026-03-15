import type { PaginatedResult } from '@pawmeet/types';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { handleError } from '@/lib/error-handler';
import type { AdminGroupEventListItem, ListGroupEventsParams } from '@/repositories';
import { fetchGroupEvents } from './actions';

type EventStatus = NonNullable<ListGroupEventsParams['status']>;
type EventCategory = NonNullable<ListGroupEventsParams['category']>;

export function useGroupEventsViewModel(
  initialData: PaginatedResult<AdminGroupEventListItem>,
  pageSize: number,
) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | undefined>(undefined);
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
      const result = await fetchGroupEvents({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter,
        category: categoryFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento degli eventi'));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleStatusFilterChange(status: EventStatus | undefined) {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleCategoryFilterChange(category: EventCategory | undefined) {
    setCategoryFilter(category);
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
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    categoryFilter,
    setCategoryFilter: handleCategoryFilterChange,
    pagination,
    setPagination,
  };
}
