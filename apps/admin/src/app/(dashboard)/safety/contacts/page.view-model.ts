import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { TIMING } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { fetchEmergencyContacts } from '../actions';

export type ContactsData = Awaited<ReturnType<typeof fetchEmergencyContacts>>;
export type EmergencyContactItem = ContactsData['data'][number];

export function useContactsViewModel(initialData: ContactsData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, TIMING.DEBOUNCE_DELAY_MS);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchEmergencyContacts({
        page: table.page,
        pageSize: table.pageSize,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento dei contatti'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch]);

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
      table.onPageChange(0);
    }
  }

  return {
    data: data.data,
    total: data.total,
    totalPages: table.totalPages,
    isLoading,
    search,
    setSearch: handleSearchChange,
    pagination: table.pagination,
    setPagination: table.setPagination,
  };
}
