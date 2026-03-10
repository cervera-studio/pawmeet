'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { useUsersViewModel } from './page.view-model';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'banned';
  dogsCount: number;
  createdAt: string;
}

const columns: ColumnDef<User>[] = [
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
    accessorKey: 'createdAt',
    header: 'Registrato il',
    cell: ({ row }) => {
      return new Date(row.getValue('createdAt')).toLocaleDateString('it-IT');
    },
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

export default function UsersPage() {
  const vm = useUsersViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Utenti</h1>
          <p className="text-neutral-500">Gestisci gli utenti della piattaforma</p>
        </div>
      </div>

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
    </div>
  );
}
