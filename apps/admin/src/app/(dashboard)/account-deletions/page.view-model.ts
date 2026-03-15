import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import { fetchPendingDeletions } from './actions';

export type DeletionsData = Awaited<ReturnType<typeof fetchPendingDeletions>>;
export type PendingDeletion = DeletionsData['data'][number];

export function useDeletionsViewModel(initialData: DeletionsData, pageSize: number) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPendingDeletions({
        page: table.page,
        pageSize: table.pageSize,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento delle cancellazioni'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize]);

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
    totalPages: table.totalPages,
    isLoading,
    pagination: table.pagination,
    setPagination: table.setPagination,
    refetch: fetchData,
  };
}
