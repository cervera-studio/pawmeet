'use client';

import type { PaginatedResult } from '@dogwalk/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/formatters';
import type { AdminDogListItem } from '@/repositories';
import { fetchDogs } from './actions';

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
    cell: ({ row }) => formatDate(row.getValue('createdAt')),
  },
];

interface DogsTableProps {
  initialData: PaginatedResult<AdminDogListItem>;
  pageSize: number;
}

export function DogsTable({ initialData, pageSize }: DogsTableProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<AdminDogListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Track whether we need to fetch (i.e. user navigated/searched beyond initial data)
  const isInitialState = pagination.pageIndex === 0 && debouncedSearch === '';

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadDogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDogs({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('[Dogs] Failed to fetch dogs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  // Only fetch client-side when user interacts (search or paginate beyond initial)
  useEffect(() => {
    if (isInitialState) return;
    void loadDogs();
  }, [loadDogs, isInitialState]);

  return (
    <>
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
        data={(data.data as DogRow[]) ?? []}
        total={data.total}
        totalPages={Math.ceil(data.total / pagination.pageSize)}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </>
  );
}
