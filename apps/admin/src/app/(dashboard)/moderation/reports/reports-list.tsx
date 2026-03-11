'use client';

import type { PaginatedResult } from '@dogwalk/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { REPORT_STATUS_CONFIG, StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/formatters';
import {
  type AdminReportListItem,
  type ReportStatus,
  type ResolveAction,
  reportRepository,
} from '@/repositories';

export const STATUS_TABS: { label: string; value: ReportStatus | undefined }[] = [
  { label: 'Tutte', value: undefined },
  { label: 'In attesa', value: 'pending' },
  { label: 'Risolte', value: 'resolved' },
  { label: 'Archiviate', value: 'dismissed' },
];

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

const REASON_LABEL: Record<string, string> = {
  inappropriate: 'Comportamento inappropriato',
  fake: 'Profilo falso',
  harassment: 'Molestie',
  spam: 'Spam',
  other: 'Altro',
};

const ACTION_LABELS: Record<string, string> = {
  dismiss: 'Segnalazione archiviata',
  warn: 'Avvertimento inviato',
  suspend: 'Utente sospeso',
  ban: 'Utente bannato',
};

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

  if (status !== 'pending') {
    return (
      <span className="text-xs text-neutral-400">
        {REPORT_STATUS_CONFIG[status]?.label ?? status}
      </span>
    );
  }

  async function handleAction(action: ResolveAction) {
    setIsPending(true);
    try {
      await reportRepository.resolve(reportId, action);
      toast.success(ACTION_LABELS[action] ?? 'Azione completata');
      onResolved();
    } catch {
      toast.error("Errore durante l'azione");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>{isPending ? 'Attendere...' : 'Gestisci'}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleAction('dismiss')}>Archivia</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('warn')}>Avverti utente</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('suspend')} className="text-orange-600">
          Sospendi utente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('ban')} className="text-red-600">
          Banna utente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ReportsListProps {
  initialData: PaginatedResult<AdminReportListItem>;
}

export function ReportsList({ initialData }: ReportsListProps) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [data, setData] = useState<PaginatedResult<AdminReportListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchReports(
    paginationOverride?: { pageIndex: number; pageSize: number },
    statusOverride?: ReportStatus | undefined,
  ) {
    const pag = paginationOverride ?? pagination;
    const status = statusOverride !== undefined ? statusOverride : statusFilter;
    setIsLoading(true);
    try {
      const result = await reportRepository.list({
        page: pag.pageIndex + 1,
        pageSize: pag.pageSize,
        status,
      });
      setData(result);
    } catch (error) {
      console.error('[Reports] Failed to fetch reports:', error);
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
      header: 'Segnalante',
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
      header: 'Segnalato',
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
      header: 'Motivo',
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string;
        return REASON_LABEL[reason] ?? reason;
      },
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <StatusBadge status={status} type="report" />;
      },
    },
    {
      accessorKey: 'resolvedAction',
      header: 'Azione',
      cell: ({ row }) => {
        const action = row.getValue('resolvedAction') as string | null;
        if (!action) return <span className="text-neutral-400">-</span>;
        return <span className="text-sm">{ACTION_LABELS[action] ?? action}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Data',
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
        <h1 className="text-2xl font-bold text-neutral-900">Segnalazioni</h1>
        <p className="text-neutral-500">Gestisci le segnalazioni degli utenti</p>
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
