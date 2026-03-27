'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { ExportAllButton } from '@/components/export-all-button';
import { ExportButton } from '@/components/export-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { formatDate } from '@/lib/formatters';
import type { WaitlistContact } from './actions';
import { fetchAllWaitlistForExport, removeWaitlistContact } from './actions';
import { useWaitlistViewModel } from './page.view-model';

interface WaitlistTableProps {
  initialData: PaginatedResult<WaitlistContact>;
  initialSearch?: string;
}

export function WaitlistTable({ initialData, initialSearch }: WaitlistTableProps) {
  const t = useTranslations('waitlist');
  const tc = useTranslations('common');
  const tt = useTranslations('toast');
  const vm = useWaitlistViewModel(initialData, initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleRemove = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await removeWaitlistContact(id);
        if (result.success) {
          toast.success(tt('waitlist.removed'));
          void vm.refetch();
        } else {
          toast.error(handleError(result.error, tt('waitlist.removeError')));
        }
      });
    },
    [tt, vm],
  );

  const columns: ColumnDef<WaitlistContact>[] = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: t('columns.email'),
      },
      {
        accessorKey: 'locale',
        header: t('columns.locale'),
      },
      {
        accessorKey: 'subscribedAt',
        header: t('columns.subscribedAt'),
        cell: ({ row }) => formatDate(row.original.subscribedAt),
      },
      {
        accessorKey: 'source',
        header: t('columns.source'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleRemove(row.original.id)}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {tc('delete')}
          </Button>
        ),
      },
    ],
    [t, tc, isPending, handleRemove],
  );

  return (
    <>
      {/* Search + Export */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          className="max-w-sm"
          value={vm.globalFilter}
          onChange={(e) => vm.setGlobalFilter(e.target.value)}
        />
        <ExportButton data={vm.data} filename="waitlist-export" />
        <ExportAllButton
          fetchAll={() => fetchAllWaitlistForExport(vm.globalFilter || undefined)}
          filename="waitlist-export-all"
          label="Export All"
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
    </>
  );
}
