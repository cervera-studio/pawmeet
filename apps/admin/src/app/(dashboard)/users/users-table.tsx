'use client';

import type { PaginatedResult } from '@dogwalk/types';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/formatters';
import type { AdminUserListItem } from '@/repositories';
import { useUsersViewModel } from './page.view-model';

const columns: ColumnDef<AdminUserListItem>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return <StatusBadge status={status} type="user" />;
    },
  },
  {
    accessorKey: 'dogsCount',
    header: 'Cani',
  },
  {
    accessorKey: 'followersCount',
    header: 'Follower',
  },
  {
    accessorKey: 'followingCount',
    header: 'Seguiti',
  },
  {
    accessorKey: 'createdAt',
    header: 'Registrato il',
    cell: ({ row }) => formatDate(row.getValue('createdAt')),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <a
        href={`/users/${row.original.id}`}
        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs hover:bg-neutral-100 transition-colors"
      >
        Dettagli
      </a>
    ),
  },
];

interface UsersTableProps {
  initialData: PaginatedResult<AdminUserListItem>;
}

export function UsersTable({ initialData }: UsersTableProps) {
  const vm = useUsersViewModel(initialData);

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cerca utenti..."
          className="max-w-sm"
          value={vm.globalFilter}
          onChange={(e) => vm.setGlobalFilter(e.target.value)}
        />
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
