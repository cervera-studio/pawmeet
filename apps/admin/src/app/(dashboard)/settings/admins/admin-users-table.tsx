'use client';

import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminPassword,
  toggleAdminActive,
  updateAdminRole,
} from './actions';

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

interface AdminUsersTableProps {
  initialData: AdminUsersData;
  pageSize: number;
}

const ROLES = ['super_admin', 'admin', 'moderator', 'viewer'] as const;
type Role = (typeof ROLES)[number];

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

export function AdminUsersTable({ initialData, pageSize }: AdminUsersTableProps) {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('common');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<AdminUsersData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('viewer');
  const [editRole, setEditRole] = useState<Role>('viewer');
  const [resetPassword, setResetPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInitialState = pagination.pageIndex === 0 && debouncedSearch === '' && !roleFilter;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAdminUsers({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[AdminUsers] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, roleFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadData();
  }, [loadData, isInitialState]);

  async function handleCreate() {
    setIsSubmitting(true);
    try {
      await createAdminUser({
        email: newEmail,
        displayName: newDisplayName,
        role: newRole,
        temporaryPassword: newTempPassword,
      });
      setCreateDialogOpen(false);
      setNewEmail('');
      setNewDisplayName('');
      setNewTempPassword('');
      setNewRole('viewer');
      void loadData();
    } catch (error) {
      console.error('[AdminUsers] Failed to create:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateRole() {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateAdminRole({ adminId: selectedUser.id, newRole: editRole });
      setEditRoleDialogOpen(false);
      setSelectedUser(null);
      void loadData();
    } catch (error) {
      console.error('[AdminUsers] Failed to update role:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleActive = useCallback(
    async (user: AdminUser) => {
      try {
        await toggleAdminActive({ adminId: user.id });
        void loadData();
      } catch (error) {
        console.error('[AdminUsers] Failed to toggle active:', error);
      }
    },
    [loadData],
  );

  async function handleResetPassword() {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await resetAdminPassword({ adminId: selectedUser.id, newPassword: resetPassword });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetPassword('');
    } catch (error) {
      console.error('[AdminUsers] Failed to reset password:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const openEditRoleDialog = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setEditRole(user.role as Role);
    setEditRoleDialogOpen(true);
  }, []);

  const openResetPasswordDialog = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }, []);

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
          const key = `roles.${role}` as
            | 'roles.super_admin'
            | 'roles.admin'
            | 'roles.moderator'
            | 'roles.viewer';
          return <Badge variant={getRoleBadgeVariant(role)}>{t(key)}</Badge>;
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
          if (!value) return <span className="text-neutral-400">{tc('never')}</span>;
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
    [t, tc, handleToggleActive, openEditRoleDialog, openResetPasswordDialog],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('searchPlaceholder')}
            className="max-w-sm"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={roleFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setRoleFilter((ROLES as readonly string[]).includes(v) ? (v as Role) : undefined);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <option value="">{t('allRoles')}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(
                  `roles.${role}` as
                    | 'roles.super_admin'
                    | 'roles.admin'
                    | 'roles.moderator'
                    | 'roles.viewer',
                )}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>{t('createButton')}</Button>
      </div>

      <DataTable
        columns={columns}
        data={data.data ?? []}
        total={data.total}
        totalPages={Math.ceil(data.total / pagination.pageSize)}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* Create Admin Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>{t('createDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-name">
                {t('createDialog.nameLabel')}
              </label>
              <Input
                id="create-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder={t('createDialog.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-email">
                {t('createDialog.emailLabel')}
              </label>
              <Input
                id="create-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('createDialog.emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-password">
                {t('createDialog.passwordLabel')}
              </label>
              <Input
                id="create-password"
                type="password"
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                placeholder={t('createDialog.passwordPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-role">
                {t('createDialog.roleLabel')}
              </label>
              <select
                id="create-role"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(
                      `roles.${role}` as
                        | 'roles.super_admin'
                        | 'roles.admin'
                        | 'roles.moderator'
                        | 'roles.viewer',
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !newEmail || !newDisplayName || !newTempPassword}
            >
              {isSubmitting ? tc('saving') : t('createDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editRoleDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('editRoleDialog.description', { name: selectedUser?.displayName ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-role">
                {t('editRoleDialog.roleLabel')}
              </label>
              <select
                id="edit-role"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(
                      `roles.${role}` as
                        | 'roles.super_admin'
                        | 'roles.admin'
                        | 'roles.moderator'
                        | 'roles.viewer',
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : tc('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetPasswordDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('resetPasswordDialog.description', { name: selectedUser?.displayName ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reset-password">
                {t('resetPasswordDialog.passwordLabel')}
              </label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder={t('resetPasswordDialog.passwordPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetPassword}
              disabled={isSubmitting || !resetPassword}
            >
              {isSubmitting ? tc('saving') : t('resetPasswordDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
