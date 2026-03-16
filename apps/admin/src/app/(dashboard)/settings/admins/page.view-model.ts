import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { TIMING } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { fetchAdminUsers } from './actions';

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AdminUsersData {
  data: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type { AdminUser, AdminUsersData };

const ROLES = ['super_admin', 'admin', 'moderator', 'viewer'] as const;
type Role = (typeof ROLES)[number];

export type { Role };
export { ROLES };

export function useAdminUsersViewModel(initialData: AdminUsersData, pageSize: number) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, TIMING.DEBOUNCE_DELAY_MS);
  const [roleFilter, setRoleFilter] = useState<Role | undefined>(undefined);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialRender = useRef(true);

  const table = useDataTable({ totalItems: data.total, initialPageSize: pageSize });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAdminUsers({
        page: table.page,
        pageSize: table.pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento degli amministratori'));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, roleFilter]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void fetchData();
  }, [fetchData]);

  function handleRoleFilterChange(role: Role | undefined) {
    setRoleFilter(role);
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
    roleFilter,
    setRoleFilter: handleRoleFilterChange,
    pagination: table.pagination,
    setPagination: table.setPagination,
    refetch: fetchData,
  };
}
