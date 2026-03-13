'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
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

function DaysRemainingBadge({ days }: { days: number }) {
  if (days <= 3) return <Badge variant="destructive">{days}g rimanenti</Badge>;
  if (days <= 10) return <Badge variant="warning">{days}g rimanenti</Badge>;
  return <Badge variant="secondary">{days}g rimanenti</Badge>;
}

interface DeletionsTableProps {
  initialData: PaginatedResult<PendingDeletion>;
  pageSize: number;
}

export function DeletionsTable({ initialData, pageSize }: DeletionsTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<PendingDeletion>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const columns: ColumnDef<PendingDeletion>[] = [
    {
      accessorKey: 'displayName',
      header: 'Utente',
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
      header: 'Registrato il',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'deletionScheduledAt',
      header: 'Eliminazione prevista',
      cell: ({ row }) =>
        row.original.deletionScheduledAt ? formatDateTime(row.original.deletionScheduledAt) : '-',
    },
    {
      accessorKey: 'daysRemaining',
      header: 'Tempo rimanente',
      cell: ({ row }) => <DaysRemainingBadge days={row.original.daysRemaining} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleCancel(row.original.id)}>
          Annulla eliminazione
        </Button>
      ),
    },
  ];

  async function handleCancel(userId: string) {
    try {
      await cancelDeletion(userId);
      await loadDeletions();
    } catch (error) {
      console.error('[AccountDeletions] Failed to cancel:', error);
    }
  }

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
