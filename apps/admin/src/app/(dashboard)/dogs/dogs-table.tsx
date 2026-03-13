'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface DogsTableProps {
  initialData: PaginatedResult<AdminDogListItem>;
  pageSize: number;
}

export function DogsTable({ initialData, pageSize }: DogsTableProps) {
  const t = useTranslations('dogs');
  const tc = useTranslations('common');

  const columns: ColumnDef<DogRow>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
      },
      {
        accessorKey: 'breed',
        header: t('columns.breed'),
      },
      {
        accessorKey: 'ownerName',
        header: t('columns.owner'),
        cell: ({ row }) => {
          const ownerId = row.original.ownerId;
          const name = row.original.ownerName ?? tc('unknown');
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
        header: t('columns.size'),
        cell: ({ row }) => {
          const size = row.getValue('size') as string;
          const label =
            (
              {
                small: t('sizes.small'),
                medium: t('sizes.medium'),
                large: t('sizes.large'),
              } as Record<string, string>
            )[size] ?? size;
          return <Badge variant="outline">{label}</Badge>;
        },
      },
      {
        accessorKey: 'isActive',
        header: t('columns.status'),
        cell: ({ row }) =>
          row.getValue('isActive') ? (
            <Badge variant="success">{tc('active')}</Badge>
          ) : (
            <Badge variant="outline">{tc('inactive')}</Badge>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.addedAt'),
        cell: ({ row }) => formatDate(row.getValue('createdAt')),
      },
    ],
    [t, tc],
  );
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
          placeholder={t('searchPlaceholder')}
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
