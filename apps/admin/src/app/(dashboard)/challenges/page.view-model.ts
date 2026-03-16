import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import { fetchChallenges } from './actions';

export type ChallengesData = Awaited<ReturnType<typeof fetchChallenges>>;
export type Challenge = ChallengesData['data'][number];

export function useChallengesViewModel(initialData: ChallengesData, pageSize: number) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchChallenges({
        page: table.page,
        pageSize: table.pageSize,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento delle sfide'));
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
