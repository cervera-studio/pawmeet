'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { toggleAdminActive } from './actions';
import { CreateAdminDialog } from './create-admin-dialog';
import { EditRoleDialog } from './edit-role-dialog';
import {
  type AdminUser,
  type AdminUsersData,
  buildRoleLabels,
  isValidRole,
  ROLES,
  useAdminUsersViewModel,
} from './page.view-model';
import { ResetPasswordDialog } from './reset-password-dialog';

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'super_admin':
      return 'destructive' as const;
    case 'admin':
      return 'default' as const;
    case 'moderator':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function getStatusBadgeVariant(isActive: boolean) {
  return isActive ? ('success' as const) : ('outline' as const);
}

interface AdminUsersTableProps {
  initialData: AdminUsersData;
  pageSize: number;
}

export function AdminUsersTable({ initialData, pageSize }: AdminUsersTableProps) {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('common');
  const tt = useTranslations('toast');
  const vm = useAdminUsersViewModel(initialData, pageSize);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const handleToggleActive = useCallback(
    async (user: AdminUser) => {
      try {
        await toggleAdminActive({ adminId: user.id });
        void vm.refetch();
      } catch (error) {
        toast.error(handleError(error, tt('admins.toggleStatusError')));
      }
    },
    [vm, tt],
  );

  const openEditRoleDialog = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setEditRoleDialogOpen(true);
  }, []);

  const openResetPasswordDialog = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }, []);

  const roleLabels = buildRoleLabels(t);

  const columns: ColumnDef<AdminUser>[] = useMemo(
    () => [
      {
        accessorKey: 'displayName',
        header: t('columns.displayName'),
        cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
      },
      {
        accessorKey: 'email',
        header: t('columns.email'),
        cell: ({ row }) => <span className="text-sm text-neutral-500">{row.original.email}</span>,
      },
      {
        accessorKey: 'role',
        header: t('columns.role'),
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <Badge variant={getRoleBadgeVariant(role)}>
              {isValidRole(role) ? roleLabels[role] : role}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: t('columns.status'),
        cell: ({ row }) => {
          const active = row.original.isActive;
          return (
            <Badge variant={getStatusBadgeVariant(active)}>
              {active ? t('statuses.active') : t('statuses.inactive')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'lastLoginAt',
        header: t('columns.lastLoginAt'),
        cell: ({ row }) => {
          const value = row.original.lastLoginAt;
          if (!value) return <span className="text-neutral-500">{tc('never')}</span>;
          return formatDateTime(value);
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => openEditRoleDialog(row.original)}>
              {t('actions.editRole')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleToggleActive(row.original)}>
              {row.original.isActive ? t('actions.deactivate') : t('actions.activate')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetPasswordDialog(row.original)}
            >
              {t('actions.resetPassword')}
            </Button>
          </div>
        ),
      },
    ],
    [t, tc, roleLabels, handleToggleActive, openEditRoleDialog, openResetPasswordDialog],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('searchPlaceholder')}
            className="max-w-sm"
            value={vm.search}
            onChange={(e) => vm.setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            value={vm.roleFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              vm.setRoleFilter(isValidRole(v) ? v : undefined);
            }}
          >
            <option value="">{t('allRoles')}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>{t('createButton')}</Button>
      </div>

      <DataTable
        columns={columns}
        data={vm.data ?? []}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />

      <CreateAdminDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => void vm.refetch()}
      />

      <EditRoleDialog
        open={editRoleDialogOpen}
        onOpenChange={setEditRoleDialogOpen}
        user={selectedUser}
        onUpdated={() => void vm.refetch()}
      />

      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
        onReset={() => void vm.refetch()}
      />
    </>
  );
}
