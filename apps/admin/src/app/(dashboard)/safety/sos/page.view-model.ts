import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { handleError } from '@/lib/error-handler';
import { fetchSosAlerts } from '../actions';

export type AlertType = 'sos' | 'auto_alert' | 'checkin';

export type SosData = Awaited<ReturnType<typeof fetchSosAlerts>>;
export type SosAlertItem = SosData['data'][number];

export const ALERT_TYPES: AlertType[] = ['sos', 'auto_alert', 'checkin'];

export function isAlertType(v: string): v is AlertType {
  return (ALERT_TYPES as string[]).includes(v);
}

export function useSosViewModel(initialData: SosData, pageSize: number) {
  const [typeFilter, setTypeFilter] = useState<AlertType | undefined>(undefined);
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
      const result = await fetchSosAlerts({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        type: typeFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento degli avvisi SOS'));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, typeFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleTypeFilterChange(type: AlertType | undefined) {
    setTypeFilter(type);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  return {
    data: data.data,
    total: data.total,
    totalPages: Math.ceil(data.total / pagination.pageSize),
    isLoading,
    typeFilter,
    setTypeFilter: handleTypeFilterChange,
    pagination,
    setPagination,
  };
}
