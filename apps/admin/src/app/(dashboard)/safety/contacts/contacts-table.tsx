'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import {
  type ContactsData,
  type EmergencyContactItem,
  useContactsViewModel,
} from './page.view-model';

interface ContactsTableProps {
  initialData: ContactsData;
  pageSize: number;
}

export function ContactsTable({ initialData, pageSize }: ContactsTableProps) {
  const t = useTranslations('safety.contacts');
  const vm = useContactsViewModel(initialData, pageSize);

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
          <span className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
            {row.original.phone}
          </span>
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

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          className="max-w-sm"
          value={vm.search}
          onChange={(e) => vm.setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={vm.data ?? []}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />
    </>
  );
}
