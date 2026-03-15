import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { handleError } from '@/lib/error-handler';
import { fetchEmergencyContacts } from '../actions';

export type ContactsData = Awaited<ReturnType<typeof fetchEmergencyContacts>>;
export type EmergencyContactItem = ContactsData['data'][number];

export function useContactsViewModel(initialData: ContactsData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
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
      const result = await fetchEmergencyContacts({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento dei contatti'));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

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
    pagination,
    setPagination,
  };
}
