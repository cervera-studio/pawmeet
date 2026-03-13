'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import { cancelDeletion, fetchPendingDeletions } from './actions';

interface PendingDeletion {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  deletionScheduledAt: string | null;
  daysRemaining: number;
}

interface DeletionsTableProps {
  initialData: PaginatedResult<PendingDeletion>;
  pageSize: number;
}

function DaysRemainingBadge({ days, label }: { days: number; label: string }) {
  if (days <= 3) return <Badge variant="destructive">{label}</Badge>;
  if (days <= 10) return <Badge variant="warning">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function DeletionsTable({ initialData, pageSize }: DeletionsTableProps) {
  const t = useTranslations('accountDeletions');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<PendingDeletion>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const loadDeletions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPendingDeletions({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      setData(result);
    } catch (error) {
      console.error('[AccountDeletions] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  const handleCancel = useCallback(
    async (userId: string) => {
      try {
        await cancelDeletion(userId);
        await loadDeletions();
      } catch (error) {
        console.error('[AccountDeletions] Failed to cancel:', error);
      }
    },
    [loadDeletions],
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

  useEffect(() => {
    if (pagination.pageIndex === 0) return;
    void loadDeletions();
  }, [loadDeletions, pagination.pageIndex]);

  return (
    <DataTable
      columns={columns}
      data={data.data ?? []}
      total={data.total}
      totalPages={Math.ceil(data.total / pagination.pageSize)}
      isLoading={isLoading}
      pagination={pagination}
      onPaginationChange={setPagination}
    />
  );
}
