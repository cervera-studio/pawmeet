import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
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
  const [roleFilter, setRoleFilter] = useState<Role | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      role: roleFilter,
    }),
    [roleFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchAdminUsers,
    buildParams,
    errorMessage: tt('admins.loadError'),
  });

  function handleRoleFilterChange(role: Role | undefined) {
    setRoleFilter(role);
    paginated.resetPage();
  }

  return {
    ...paginated,
    roleFilter,
    setRoleFilter: handleRoleFilterChange,
  };
}
