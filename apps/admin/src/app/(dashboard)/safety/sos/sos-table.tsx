'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/formatters';
import { isAlertType, type SosAlertItem, type SosData, useSosViewModel } from './page.view-model';

const typeVariants: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  sos: 'destructive',
  auto_alert: 'warning',
  checkin: 'secondary',
};

interface SosTableProps {
  initialData: SosData;
  pageSize: number;
}

export function SosTable({ initialData, pageSize }: SosTableProps) {
  const t = useTranslations('safety.sos');
  const tc = useTranslations('common');
  const vm = useSosViewModel(initialData, pageSize);

  const columns: ColumnDef<SosAlertItem>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: t('columns.type'),
        cell: ({ row }) => {
          const type = row.original.type;
          const variant = typeVariants[type] ?? ('secondary' as const);
          const typeKey = type as 'sos' | 'auto_alert' | 'check_in';
          let label: string;
          if (type === 'auto_alert') {
            label = t('autoAlert');
          } else if (type === 'checkin') {
            label = t('types.check_in');
          } else {
            label = t(`types.${typeKey}`) ?? type;
          }
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
          if (!(latitude && longitude)) return '-';
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

  return (
    <>
      <div className="flex items-center gap-4">
        <select
          className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
          value={vm.typeFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            vm.setTypeFilter(isAlertType(v) ? v : undefined);
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
