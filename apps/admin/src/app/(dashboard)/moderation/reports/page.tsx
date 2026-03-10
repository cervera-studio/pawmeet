'use client';

import type { ColumnDef } from '@tanstack/react-table';
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
import { trpc } from '@/lib/trpc';
import { STATUS_TABS, useReportsViewModel } from './page.view-model';

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
    return (
      <span className="text-xs text-neutral-400">
        {REPORT_STATUS_CONFIG[status]?.label ?? status}
      </span>
    );
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
      return <StatusBadge status={status} type="report" />;
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

export default function ReportsPage() {
  const vm = useReportsViewModel();

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
            variant={vm.statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => vm.handleStatusFilterChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={(vm.data?.data as ReportRow[]) ?? []}
        total={vm.data?.total ?? 0}
        totalPages={vm.data?.totalPages ?? 1}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />
    </div>
  );
}
