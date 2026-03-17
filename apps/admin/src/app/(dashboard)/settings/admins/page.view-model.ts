import { useTranslations } from 'next-intl';
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

function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function toRole(value: string, fallback: Role = 'viewer'): Role {
  return isValidRole(value) ? value : fallback;
}

/**
 * Builds a Record mapping each role to its translated label.
 * Eliminates the need for `as 'roles.super_admin' | ...` casts with dynamic i18n keys.
 */
function buildRoleLabels(t: (key: string) => string): Record<Role, string> {
  return {
    super_admin: t('roles.super_admin'),
    admin: t('roles.admin'),
    moderator: t('roles.moderator'),
    viewer: t('roles.viewer'),
  };
}

export type { Role };
export { buildRoleLabels, isValidRole, ROLES, toRole };

export function useAdminUsersViewModel(initialData: AdminUsersData, pageSize: number) {
  const tt = useTranslations('toast');
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
      toast.error(handleError(error, tt('admins.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [table.page, table.pageSize, debouncedSearch, roleFilter, tt]);

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
