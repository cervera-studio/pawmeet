import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
      const result = await fetchAuditLog({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        resourceType: resourceFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[AuditLog] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, resourceFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleResourceFilterChange(type: ResourceType | undefined) {
    setResourceFilter(type);
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
    resourceFilter,
    setResourceFilter: handleResourceFilterChange,
    pagination,
    setPagination,
  };
}
