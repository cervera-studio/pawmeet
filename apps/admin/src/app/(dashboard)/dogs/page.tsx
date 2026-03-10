'use client';

import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

interface DogRow {
  id: string;
  name: string;
  breed: string;
  ownerName: string | null;
  ownerId: string | null;
  size: string;
  isActive: boolean;
  createdAt: string;
}

const columns: ColumnDef<DogRow>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'breed',
    header: 'Razza',
  },
  {
    accessorKey: 'ownerName',
    header: 'Proprietario',
    cell: ({ row }) => {
      const ownerId = row.original.ownerId;
      const name = row.original.ownerName ?? 'Sconosciuto';
      return ownerId ? (
        <a href={`/users/${ownerId}`} className="text-primary-600 hover:underline">
          {name}
        </a>
      ) : (
        name
      );
    },
  },
  {
    accessorKey: 'size',
    header: 'Taglia',
    cell: ({ row }) => {
      const size = row.getValue('size') as string;
      const label =
        ({ small: 'Piccolo', medium: 'Medio', large: 'Grande' } as Record<string, string>)[size] ??
        size;
      return <Badge variant="outline">{label}</Badge>;
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Stato',
    cell: ({ row }) =>
      row.getValue('isActive') ? (
        <Badge variant="success">Attivo</Badge>
      ) : (
        <Badge variant="outline">Inattivo</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Aggiunto il',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString('it-IT'),
  },
];

export default function DogsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Simple debounce via timeout ref
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const { data, isLoading } = trpc.admin.listDogs.useQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Cani</h1>
        <p className="text-neutral-500">Tutti i cani registrati sulla piattaforma</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cerca per nome, razza o proprietario..."
          className="max-w-sm"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={(data?.data as DogRow[]) ?? []}
        total={data?.total ?? 0}
        totalPages={data?.totalPages ?? 1}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
