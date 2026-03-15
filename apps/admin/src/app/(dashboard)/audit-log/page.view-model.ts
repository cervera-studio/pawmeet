import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDataTable } from '@/hooks/use-data-table';
import { handleError } from '@/lib/error-handler';
import { fetchAuditLog } from './actions';

export type AuditLogData = Awaited<ReturnType<typeof fetchAuditLog>>;
export type AuditLogEntry = AuditLogData['data'][number];

const RESOURCE_TYPES = [
  'user',
  'dog',
  'photo',
  'report',
  'post',
  'story',
  'event',
  'organization',
  'sponsor',
  'settings',
  'deletion',
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number];

export { RESOURCE_TYPES };
export type { ResourceType };

export function isResourceType(v: string): v is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(v);
}

export function useAuditLogViewModel(initialData: AuditLogData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [resourceFilter, setResourceFilter] = useState<ResourceType | undefined>(undefined);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAuditLog({
        page: table.page,
        pageSize: table.pageSize,
        search: debouncedSearch || undefined,
        resourceType: resourceFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento del registro'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, resourceFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleResourceFilterChange(type: ResourceType | undefined) {
    setResourceFilter(type);
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
    resourceFilter,
    setResourceFilter: handleResourceFilterChange,
    pagination: table.pagination,
    setPagination: table.setPagination,
  };
}
