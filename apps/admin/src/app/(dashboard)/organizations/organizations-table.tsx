'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import type { AdminOrganizationListItem, ListOrganizationsParams } from '@/repositories';
import { fetchOrganizations } from './actions';

type OrgType = NonNullable<ListOrganizationsParams['type']>;

const ORG_TYPES: OrgType[] = ['pawmeet_team', 'association', 'educator', 'brand'];

function isOrgType(v: string): v is OrgType {
  return (ORG_TYPES as string[]).includes(v);
}

const typeLabels: Record<string, string> = {
  pawmeet_team: 'PawMeet Team',
  association: 'Associazione',
  educator: 'Educatore',
  brand: 'Brand',
};

const columns: ColumnDef<AdminOrganizationListItem>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) => (
      <a
        href={`/organizations/${row.original.id}`}
        className="font-medium text-primary-600 hover:underline"
      >
        {row.original.name}
      </a>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-neutral-500">{row.original.slug}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant="outline">{typeLabels[row.original.type] ?? row.original.type}</Badge>
    ),
  },
  {
    accessorKey: 'isVerified',
    header: 'Stato',
    cell: ({ row }) =>
      row.original.isVerified ? (
        <Badge variant="success">Verificata</Badge>
      ) : (
        <Badge variant="secondary">Non verificata</Badge>
      ),
  },
  {
    accessorKey: 'memberCount',
    header: 'Membri',
    cell: ({ row }) => row.original.memberCount,
  },
  {
    accessorKey: 'createdAt',
    header: 'Creata il',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
];

interface OrganizationsTableProps {
  initialData: PaginatedResult<AdminOrganizationListItem>;
  pageSize: number;
}

export function OrganizationsTable({ initialData, pageSize }: OrganizationsTableProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrgType | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<AdminOrganizationListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isInitialState = pagination.pageIndex === 0 && debouncedSearch === '' && !typeFilter;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchOrganizations({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        type: typeFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[Organizations] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, typeFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadOrganizations();
  }, [loadOrganizations, isInitialState]);

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cerca per nome o slug..."
          className="max-w-sm"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={typeFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setTypeFilter(isOrgType(v) ? v : undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <option value="">Tutti i tipi</option>
          <option value="pawmeet_team">PawMeet Team</option>
          <option value="association">Associazione</option>
          <option value="educator">Educatore</option>
          <option value="brand">Brand</option>
        </select>
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
    </>
  );
}
