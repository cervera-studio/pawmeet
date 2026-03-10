'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useServerTable } from '@/hooks/use-server-table';

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
      const variant =
        {
          active: 'success' as const,
          suspended: 'warning' as const,
          banned: 'destructive' as const,
        }[status] ?? ('outline' as const);
      const label =
        {
          active: 'Attivo',
          suspended: 'Sospeso',
          banned: 'Bannato',
        }[status] ?? status;

      return <Badge variant={variant}>{label}</Badge>;
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
  const {
    data,
    total,
    totalPages,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
  } = useServerTable<User>({ endpoint: '/admin/users', queryKey: 'admin-users' });

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
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        totalPages={totalPages}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
