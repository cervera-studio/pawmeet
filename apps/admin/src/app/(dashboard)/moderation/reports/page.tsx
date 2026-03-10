'use client';

import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';

type ReportStatus = 'pending' | 'resolved' | 'dismissed';

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

const STATUS_VARIANT: Record<string, 'warning' | 'outline' | 'success'> = {
  pending: 'warning',
  resolved: 'success',
  dismissed: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa',
  resolved: 'Risolto',
  dismissed: 'Archiviato',
};

const REASON_LABEL: Record<string, string> = {
  inappropriate: 'Comportamento inappropriato',
  fake: 'Profilo falso',
  harassment: 'Molestie',
  spam: 'Spam',
  other: 'Altro',
};

function ReportActions({ reportId, status }: { reportId: string; status: string }) {
  const utils = trpc.useUtils();

  const resolveMutation = trpc.admin.resolveReport.useMutation({
    onSuccess: (_data, variables) => {
      utils.admin.listReports.invalidate();
      const labels: Record<string, string> = {
        dismiss: 'Segnalazione archiviata',
        warn: 'Avvertimento inviato',
        suspend: 'Utente sospeso',
        ban: 'Utente bannato',
      };
      toast.success(labels[variables.action] ?? 'Azione completata');
    },
    onError: () => toast.error("Errore durante l'azione"),
  });

  if (status !== 'pending') {
    return <span className="text-xs text-neutral-400">{STATUS_LABEL[status] ?? status}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {resolveMutation.isPending ? 'Attendere...' : 'Gestisci'}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => resolveMutation.mutate({ id: reportId, action: 'dismiss' })}
        >
          Archivia
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => resolveMutation.mutate({ id: reportId, action: 'warn' })}>
          Avverti utente
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => resolveMutation.mutate({ id: reportId, action: 'suspend' })}
          className="text-orange-600"
        >
          Sospendi utente
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => resolveMutation.mutate({ id: reportId, action: 'ban' })}
          className="text-red-600"
        >
          Banna utente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
      const variant = STATUS_VARIANT[status] ?? 'outline';
      const label = STATUS_LABEL[status] ?? status;
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: 'resolvedAction',
    header: 'Azione',
    cell: ({ row }) => {
      const action = row.getValue('resolvedAction') as string | null;
      if (!action) return <span className="text-neutral-400">-</span>;
      const labels: Record<string, string> = {
        dismiss: 'Archiviato',
        warn: 'Avvertimento',
        suspend: 'Sospeso',
        ban: 'Bannato',
      };
      return <span className="text-sm">{labels[action] ?? action}</span>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Data',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString('it-IT'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <ReportActions reportId={row.original.id} status={row.original.status} />,
  },
];

const STATUS_TABS: { label: string; value: ReportStatus | undefined }[] = [
  { label: 'Tutte', value: undefined },
  { label: 'In attesa', value: 'pending' },
  { label: 'Risolte', value: 'resolved' },
  { label: 'Archiviate', value: 'dismissed' },
];

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data, isLoading } = trpc.admin.listReports.useQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
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
            onClick={() => {
              setStatusFilter(tab.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={(data?.data as ReportRow[]) ?? []}
        total={data?.total ?? 0}
        totalPages={data?.totalPages ?? 1}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
