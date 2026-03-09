'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Placeholder type - in production, import from @dogwalk/types
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
      const variant = {
        active: 'success' as const,
        suspended: 'warning' as const,
        banned: 'destructive' as const,
      }[status] ?? 'outline' as const;

      return <Badge variant={variant}>{status}</Badge>;
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
      <Button variant="ghost" size="sm" asChild>
        <a href={`/users/${row.original.id}`}>Dettagli</a>
      </Button>
    ),
  },
];

// Placeholder data
const mockUsers: User[] = [
  { id: '1', name: 'Mario Rossi', email: 'mario@example.com', status: 'active', dogsCount: 2, createdAt: '2024-01-15' },
  { id: '2', name: 'Laura Bianchi', email: 'laura@example.com', status: 'active', dogsCount: 1, createdAt: '2024-02-20' },
  { id: '3', name: 'Giuseppe Verdi', email: 'giuseppe@example.com', status: 'suspended', dogsCount: 3, createdAt: '2024-03-10' },
];

export default function UsersPage() {
  // TODO: Replace with useServerTable hook
  // const { data, isLoading, ... } = useServerTable<User>({ endpoint: '/admin/users', queryKey: 'users' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Utenti</h1>
          <p className="text-neutral-500">Gestisci gli utenti della piattaforma</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cerca utenti..."
          className="max-w-sm"
        />
        <Button variant="outline" size="sm">
          Filtri
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={mockUsers}
        total={mockUsers.length}
        totalPages={1}
      />
    </div>
  );
}
