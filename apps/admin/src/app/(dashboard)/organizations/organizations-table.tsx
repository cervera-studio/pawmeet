'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface OrganizationsTableProps {
  initialData: PaginatedResult<AdminOrganizationListItem>;
  pageSize: number;
}

export function OrganizationsTable({ initialData, pageSize }: OrganizationsTableProps) {
  const t = useTranslations('organizations');
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

  const columns: ColumnDef<AdminOrganizationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
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
        header: t('columns.slug'),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-500">{row.original.slug}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: t('columns.type'),
        cell: ({ row }) => (
          <Badge variant="outline">
            {t(
              `types.${row.original.type}` as
                | 'types.association'
                | 'types.educator'
                | 'types.brand'
                | 'types.pawmeet_team',
            ) ?? row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: 'isVerified',
        header: t('columns.status'),
        cell: ({ row }) =>
          row.original.isVerified ? (
            <Badge variant="success">{t('verified')}</Badge>
          ) : (
            <Badge variant="secondary">{t('notVerified')}</Badge>
          ),
      },
      {
        accessorKey: 'memberCount',
        header: t('columns.members'),
        cell: ({ row }) => row.original.memberCount,
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [t],
  );

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
          placeholder={t('searchPlaceholder')}
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
          <option value="">{t('allTypes')}</option>
          <option value="pawmeet_team">{t('types.pawmeet_team')}</option>
          <option value="association">{t('types.association')}</option>
          <option value="educator">{t('types.educator')}</option>
          <option value="brand">{t('types.brand')}</option>
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
