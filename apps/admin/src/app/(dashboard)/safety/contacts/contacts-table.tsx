'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import { fetchEmergencyContacts } from '../actions';

interface EmergencyContactItem {
  id: string;
  userId: string;
  userName: string | null;
  contactName: string;
  phone: string;
  relationship: string | null;
  createdAt: string | Date;
}

interface ContactsTableProps {
  initialData: PaginatedResult<EmergencyContactItem>;
  pageSize: number;
}

export function ContactsTable({ initialData, pageSize }: ContactsTableProps) {
  const t = useTranslations('safety.contacts');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<EmergencyContactItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

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

  const columns: ColumnDef<EmergencyContactItem>[] = useMemo(
    () => [
      {
        accessorKey: 'userName',
        header: t('columns.owner'),
        cell: ({ row }) => (
          <a
            href={`/users/${row.original.userId}`}
            className="font-medium text-primary-600 hover:underline"
          >
            {row.original.userName ?? '-'}
          </a>
        ),
      },
      {
        accessorKey: 'contactName',
        header: t('columns.contactName'),
        cell: ({ row }) => row.original.contactName,
      },
      {
        accessorKey: 'phone',
        header: t('columns.phone'),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-500">{row.original.phone}</span>
        ),
      },
      {
        accessorKey: 'relationship',
        header: t('columns.relationship'),
        cell: ({ row }) => row.original.relationship ?? '-',
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.addedAt'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [t],
  );

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchEmergencyContacts({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('[Safety] Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (isInitialState) return;
    void loadContacts();
  }, [loadContacts, isInitialState]);

  return (
    <>
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
