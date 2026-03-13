'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const typeVariants: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  sos: 'destructive',
  auto_alert: 'warning',
  checkin: 'secondary',
};

interface SosTableProps {
  initialData: PaginatedResult<SosAlertItem>;
  pageSize: number;
}

export function SosTable({ initialData, pageSize }: SosTableProps) {
  const t = useTranslations('safety.sos');
  const tc = useTranslations('common');
  const [typeFilter, setTypeFilter] = useState<AlertType | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<SosAlertItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const isInitialState = pagination.pageIndex === 0 && !typeFilter;

  const columns: ColumnDef<SosAlertItem>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: t('columns.type'),
        cell: ({ row }) => {
          const type = row.original.type;
          const variant = typeVariants[type] ?? ('secondary' as const);
          const typeKey = type as 'sos' | 'auto_alert' | 'check_in';
          const label =
            type === 'auto_alert'
              ? t('autoAlert')
              : type === 'checkin'
                ? t('types.check_in')
                : (t(`types.${typeKey}`) ?? type);
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        accessorKey: 'userName',
        header: t('columns.user'),
        cell: ({ row }) => (
          <a
            href={`/users/${row.original.userId}`}
            className="font-medium text-primary-600 hover:underline"
          >
            {row.original.userName ?? tc('unknown')}
          </a>
        ),
      },
      {
        accessorKey: 'walkTitle',
        header: t('columns.walk'),
        cell: ({ row }) => row.original.walkTitle ?? '-',
      },
      {
        accessorKey: 'walkStatus',
        header: t('columns.walkStatus'),
        cell: ({ row }) => {
          const status = row.original.walkStatus;
          if (!status) return '-';
          const label =
            t(
              `walkStatuses.${status}` as
                | 'walkStatuses.pending'
                | 'walkStatuses.accepted'
                | 'walkStatuses.rejected'
                | 'walkStatuses.cancelled'
                | 'walkStatuses.completed',
            ) ?? status;
          return <Badge variant="outline">{label}</Badge>;
        },
      },
      {
        accessorKey: 'location',
        header: t('columns.location'),
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
        header: t('columns.date'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [t, tc],
  );

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
          <option value="">{t('allTypes')}</option>
          <option value="sos">{t('types.sos')}</option>
          <option value="auto_alert">{t('types.auto_alert')}</option>
          <option value="checkin">{t('types.check_in')}</option>
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
