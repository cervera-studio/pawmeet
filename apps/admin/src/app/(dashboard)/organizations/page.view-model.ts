import type { PaginatedResult } from '@pawmeet/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import type { AdminOrganizationListItem, ListOrganizationsParams } from '@/repositories';
import { fetchOrganizations } from './actions';

type OrgType = NonNullable<ListOrganizationsParams['type']>;

export function useOrganizationsViewModel(
  initialData: PaginatedResult<AdminOrganizationListItem>,
  pageSize: number,
) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeFilter, setTypeFilter] = useState<OrgType | undefined>(undefined);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchOrganizations({
        page: table.page,
        pageSize: table.pageSize,
        search: debouncedSearch || undefined,
        type: typeFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento delle organizzazioni'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, typeFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleTypeFilterChange(type: OrgType | undefined) {
    setTypeFilter(type);
    table.onPageChange(0);
  }

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
    typeFilter,
    setTypeFilter: handleTypeFilterChange,
    pagination: table.pagination,
    setPagination: table.setPagination,
  };
}
