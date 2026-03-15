'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { type CreateAdminUserFormValues, createAdminUserSchema } from '@/lib/schemas/admin-user';
import { createAdminUser, resetAdminPassword, toggleAdminActive, updateAdminRole } from './actions';
import {
  type AdminUser,
  type AdminUsersData,
  ROLES,
  type Role,
  useAdminUsersViewModel,
} from './page.view-model';

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
  const vm = useAdminUsersViewModel(initialData, pageSize);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [editRole, setEditRole] = useState<Role>('viewer');
  const [resetPwd, setResetPwd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createForm = useForm<CreateAdminUserFormValues>({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: {
      email: '',
      displayName: '',
      temporaryPassword: '',
      role: 'viewer',
    },
  });

  async function handleCreate(data: CreateAdminUserFormValues) {
    setIsSubmitting(true);
    try {
      await createAdminUser({
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        temporaryPassword: data.temporaryPassword,
      });
      setCreateDialogOpen(false);
      createForm.reset();
      void vm.refetch();
    } catch (error) {
      toast.error(handleError(error, "Errore durante la creazione dell'amministratore"));
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
      void vm.refetch();
    } catch (error) {
      toast.error(handleError(error, "Errore durante l'aggiornamento del ruolo"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleActive = useCallback(
    async (user: AdminUser) => {
      try {
        await toggleAdminActive({ adminId: user.id });
        void vm.refetch();
      } catch (error) {
        toast.error(handleError(error, 'Errore durante il cambio di stato'));
      }
    },
    [vm],
  );

  async function handleResetPassword() {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await resetAdminPassword({ adminId: selectedUser.id, newPassword: resetPwd });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetPwd('');
    } catch (error) {
      toast.error(handleError(error, 'Errore durante il reset della password'));
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
        cell: ({ row }) => (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {row.original.email}
          </span>
        ),
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
          if (!value)
            return <span className="text-neutral-400 dark:text-neutral-500">{tc('never')}</span>;
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

  function renderRoleSelect(id: string, value: Role, onChange: (r: Role) => void) {
    return (
      <select
        id={id}
        className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as Role)}
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
    );
  }

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
            className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            value={vm.roleFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              vm.setRoleFilter((ROLES as readonly string[]).includes(v) ? (v as Role) : undefined);
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
        data={vm.data ?? []}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />

      {/* Create Admin Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>{t('createDialog.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create-name">
                  {t('createDialog.nameLabel')}
                </label>
                <Input
                  id="create-name"
                  {...createForm.register('displayName')}
                  placeholder={t('createDialog.namePlaceholder')}
                />
                {createForm.formState.errors.displayName && (
                  <p className="text-xs text-red-600">
                    {createForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create-email">
                  {t('createDialog.emailLabel')}
                </label>
                <Input
                  id="create-email"
                  type="email"
                  {...createForm.register('email')}
                  placeholder={t('createDialog.emailPlaceholder')}
                />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-red-600">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create-password">
                  {t('createDialog.passwordLabel')}
                </label>
                <Input
                  id="create-password"
                  type="password"
                  {...createForm.register('temporaryPassword')}
                  placeholder={t('createDialog.passwordPlaceholder')}
                />
                {createForm.formState.errors.temporaryPassword && (
                  <p className="text-xs text-red-600">
                    {createForm.formState.errors.temporaryPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create-role">
                  {t('createDialog.roleLabel')}
                </label>
                <select
                  id="create-role"
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
                  {...createForm.register('role')}
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
                {createForm.formState.errors.role && (
                  <p className="text-xs text-red-600">{createForm.formState.errors.role.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('saving') : t('createDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
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
              {renderRoleSelect('edit-role', editRole, setEditRole)}
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
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
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
              disabled={isSubmitting || !resetPwd}
            >
              {isSubmitting ? tc('saving') : t('resetPasswordDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
