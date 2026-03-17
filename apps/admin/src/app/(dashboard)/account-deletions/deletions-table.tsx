'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { cancelDeletion } from './actions';
import { type DeletionsData, type PendingDeletion, useDeletionsViewModel } from './page.view-model';

function DaysRemainingBadge({ days, label }: { days: number; label: string }) {
  if (days <= 3) return <Badge variant="destructive">{label}</Badge>;
  if (days <= 10) return <Badge variant="warning">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

interface DeletionsTableProps {
  initialData: DeletionsData;
  pageSize: number;
}

export function DeletionsTable({ initialData, pageSize }: DeletionsTableProps) {
  const t = useTranslations('accountDeletions');
  const vm = useDeletionsViewModel(initialData, pageSize);

  const handleCancel = useCallback(
    async (userId: string) => {
      try {
        await cancelDeletion(userId);
        void vm.refetch();
      } catch (error) {
        toast.error(handleError(error, "Errore durante l'annullamento della cancellazione"));
      }
    },
    [vm],
  );

  const columns: ColumnDef<PendingDeletion>[] = useMemo(
    () => [
      {
        accessorKey: 'displayName',
        header: t('columns.user'),
        cell: ({ row }) => (
          <a
            href={`/users/${row.original.id}`}
            className="font-medium text-primary-600 hover:underline"
          >
            {row.original.displayName}
          </a>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-sm text-neutral-500">{row.original.email}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.registeredAt'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'deletionScheduledAt',
        header: t('columns.scheduledDeletion'),
        cell: ({ row }) =>
          row.original.deletionScheduledAt ? formatDateTime(row.original.deletionScheduledAt) : '-',
      },
      {
        accessorKey: 'daysRemaining',
        header: t('columns.timeRemaining'),
        cell: ({ row }) => (
          <DaysRemainingBadge
            days={row.original.daysRemaining}
            label={t('daysRemaining', { days: row.original.daysRemaining })}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => handleCancel(row.original.id)}>
            {t('columns.cancelDeletion')}
          </Button>
        ),
      },
    ],
    [t, handleCancel],
  );

  return (
    <DataTable
      columns={columns}
      data={vm.data ?? []}
      total={vm.total}
      totalPages={vm.totalPages}
      isLoading={vm.isLoading}
      pagination={vm.pagination}
      onPaginationChange={vm.setPagination}
    />
  );
}
