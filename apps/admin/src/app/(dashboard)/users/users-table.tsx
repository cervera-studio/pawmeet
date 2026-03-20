'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { ExportButton } from '@/components/export-button';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/formatters';
import type { AdminUserListItem } from '@/repositories';
import { useUsersViewModel } from './page.view-model';

interface UsersTableProps {
  initialData: PaginatedResult<AdminUserListItem>;
  initialSearch?: string;
}

export function UsersTable({ initialData, initialSearch }: UsersTableProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const vm = useUsersViewModel(initialData, initialSearch);

  const columns: ColumnDef<AdminUserListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
      },
      {
        accessorKey: 'email',
        header: t('columns.email'),
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          return <StatusBadge status={row.original.status} type="user" />;
        },
      },
      {
        accessorKey: 'dogsCount',
        header: t('columns.dogs'),
      },
      {
        accessorKey: 'followersCount',
        header: t('columns.followers'),
      },
      {
        accessorKey: 'followingCount',
        header: t('columns.following'),
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.registeredAt'),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <a
            href={`/users/${row.original.id}`}
            className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs hover:bg-neutral-100 transition-colors"
          >
            {tc('details')}
          </a>
        ),
      },
    ],
    [t, tc],
  );

  return (
    <>
      {/* Search + Export */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          className="max-w-sm"
          value={vm.globalFilter}
          onChange={(e) => vm.setGlobalFilter(e.target.value)}
        />
        <ExportButton data={vm.data} filename="users-export" />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={vm.data}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        sorting={vm.sorting}
        onSortingChange={vm.setSorting}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />
    </>
  );
}
