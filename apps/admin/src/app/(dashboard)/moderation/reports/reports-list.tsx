'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { handleError } from '@/lib/error-handler';
import { formatDate } from '@/lib/formatters';
import type { AdminReportListItem, ReportStatus, ResolveAction } from '@/repositories';
import { fetchReports as fetchReportsAction, resolveReport } from './actions';

interface ReportRow {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reportedName: string;
  reportedEmail: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedAction: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

function ReportActions({
  reportId,
  status,
  onResolved,
}: {
  reportId: string;
  status: string;
  onResolved: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const t = useTranslations('reports');
  const tStatus = useTranslations('status');

  if (status !== 'pending') {
    return (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">
        {tStatus(`report.${status}` as Parameters<typeof tStatus>[0])}
      </span>
    );
  }

  async function handleAction(action: ResolveAction) {
    setIsPending(true);
    try {
      await resolveReport(reportId, action);
      toast.success(t('actions.completed'));
      onResolved();
    } catch {
      toast.error(t('actions.error'));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {isPending ? t('actions.processing') : t('actions.manage')}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleAction('dismiss')}>
          {t('actions.dismiss')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('warn')}>
          {t('actions.warn')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('suspend')} className="text-orange-600">
          {t('actions.suspend')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('ban')} className="text-red-600">
          {t('actions.ban')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ReportsListProps {
  initialData: PaginatedResult<AdminReportListItem>;
}

export function ReportsList({ initialData }: ReportsListProps) {
  const t = useTranslations('reports');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [data, setData] = useState<PaginatedResult<AdminReportListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const STATUS_TABS: { label: string; value: ReportStatus | undefined }[] = [
    { label: t('tabs.all'), value: undefined },
    { label: t('tabs.pending'), value: 'pending' },
    { label: t('tabs.resolved'), value: 'resolved' },
    { label: t('tabs.dismissed'), value: 'dismissed' },
  ];

  async function fetchReports(
    paginationOverride?: { pageIndex: number; pageSize: number },
    statusOverride?: ReportStatus | undefined,
  ) {
    const pag = paginationOverride ?? pagination;
    const status = statusOverride !== undefined ? statusOverride : statusFilter;
    setIsLoading(true);
    try {
      const result = await fetchReportsAction({
        page: pag.pageIndex + 1,
        pageSize: pag.pageSize,
        status,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento delle segnalazioni'));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStatusFilterChange(value: ReportStatus | undefined) {
    setStatusFilter(value);
    const newPagination = { ...pagination, pageIndex: 0 };
    setPagination(newPagination);
    void fetchReports(newPagination, value);
  }

  function handlePaginationChange(newPagination: { pageIndex: number; pageSize: number }) {
    setPagination(newPagination);
    void fetchReports(newPagination);
  }

  const totalPages = Math.ceil(data.total / pagination.pageSize);

  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: 'reporterName',
      header: t('columns.reporter'),
      cell: ({ row }) => (
        <a
          href={`/users/${row.original.reporterId}`}
          className="text-sm font-medium hover:text-primary-600"
        >
          {row.original.reporterName}
        </a>
      ),
    },
    {
      accessorKey: 'reportedName',
      header: t('columns.reported'),
      cell: ({ row }) => (
        <a
          href={`/users/${row.original.reportedUserId}`}
          className="text-sm font-medium hover:text-primary-600"
        >
          {row.original.reportedName}
        </a>
      ),
    },
    {
      accessorKey: 'reason',
      header: t('columns.reason'),
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string;
        return t.has(`reasons.${reason}`) ? t(`reasons.${reason}` as 'reasons.spam') : reason;
      },
    },
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <StatusBadge status={status} type="report" />;
      },
    },
    {
      accessorKey: 'resolvedAction',
      header: t('columns.action'),
      cell: ({ row }) => {
        const action = row.getValue('resolvedAction') as string | null;
        if (!action) return <span className="text-neutral-400 dark:text-neutral-500">-</span>;
        return (
          <span className="text-sm">
            {t.has(`actions.${action}`) ? t(`actions.${action}` as 'actions.dismiss') : action}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('columns.date'),
      cell: ({ row }) => formatDate(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ReportActions
          reportId={row.original.id}
          status={row.original.status}
          onResolved={() => handleStatusFilterChange(statusFilter)}
        />
      ),
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilterChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={(data.data as ReportRow[]) ?? []}
        total={data.total}
        totalPages={totalPages}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
      />
    </>
  );
}
