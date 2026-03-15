import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPendingDeletions } from './actions';

export type DeletionsData = Awaited<ReturnType<typeof fetchPendingDeletions>>;
export type PendingDeletion = DeletionsData['data'][number];

export function useDeletionsViewModel(initialData: DeletionsData, pageSize: number) {
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
      const result = await fetchPendingDeletions({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      setData(result);
    } catch (error) {
      console.error('[AccountDeletions] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  return {
    data: data.data,
    total: data.total,
    totalPages: Math.ceil(data.total / pagination.pageSize),
    isLoading,
    pagination,
    setPagination,
    refetch: fetchData,
  };
}
