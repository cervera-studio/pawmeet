'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/formatters';
import { fetchSosAlerts } from '../actions';

type AlertType = 'sos' | 'auto_alert' | 'checkin';

interface SosAlertItem {
  id: string;
  walkId: string;
  userId: string;
  userName: string | null;
  type: string;
  latitude: string | null;
  longitude: string | null;
  createdAt: string | Date;
  walkTitle: string | null;
  walkStatus: string | null;
  walkScheduledAt: string | Date | null;
}

const typeBadge: Record<string, { label: string; variant: 'destructive' | 'warning' | 'secondary' }> = {
  sos: { label: 'SOS', variant: 'destructive' },
  auto_alert: { label: 'Alert automatico', variant: 'warning' },
  checkin: { label: 'Check-in', variant: 'secondary' },
};

const columns: ColumnDef<SosAlertItem>[] = [
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const badge = typeBadge[row.original.type] ?? { label: row.original.type, variant: 'secondary' as const };
      return <Badge variant={badge.variant}>{badge.label}</Badge>;
    },
  },
  {
    accessorKey: 'userName',
    header: 'Utente',
    cell: ({ row }) => (
      <a
        href={`/users/${row.original.userId}`}
        className="font-medium text-primary-600 hover:underline"
      >
        {row.original.userName ?? 'Sconosciuto'}
      </a>
    ),
  },
  {
    accessorKey: 'walkTitle',
    header: 'Passeggiata',
    cell: ({ row }) => row.original.walkTitle ?? '-',
  },
  {
    accessorKey: 'walkStatus',
    header: 'Stato passeggiata',
    cell: ({ row }) => {
      const status = row.original.walkStatus;
      if (!status) return '-';
      const statusLabels: Record<string, string> = {
        pending: 'In attesa',
        accepted: 'Accettata',
        declined: 'Rifiutata',
        cancelled: 'Annullata',
        completed: 'Completata',
      };
      return <Badge variant="outline">{statusLabels[status] ?? status}</Badge>;
    },
  },
  {
    accessorKey: 'location',
    header: 'Posizione',
    cell: ({ row }) => {
      const { latitude, longitude } = row.original;
      if (!latitude || !longitude) return '-';
      return (
        <span className="font-mono text-sm text-neutral-500">
          {latitude}, {longitude}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Data',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
];

interface SosTableProps {
  initialData: PaginatedResult<SosAlertItem>;
  pageSize: number;
}

export function SosTable({ initialData, pageSize }: SosTableProps) {
  const [typeFilter, setTypeFilter] = useState<AlertType | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<SosAlertItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const isInitialState = pagination.pageIndex === 0 && !typeFilter;

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchSosAlerts({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        type: typeFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[Safety] Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, typeFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadAlerts();
  }, [loadAlerts, isInitialState]);

  return (
    <>
      <div className="flex items-center gap-4">
        <select
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={typeFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setTypeFilter(v === 'sos' || v === 'auto_alert' || v === 'checkin' ? v : undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <option value="">Tutti i tipi</option>
          <option value="sos">SOS</option>
          <option value="auto_alert">Alert automatici</option>
          <option value="checkin">Check-in</option>
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
