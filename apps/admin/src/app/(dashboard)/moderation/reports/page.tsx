'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Report {
  id: string;
  reporterName: string;
  reportedName: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

const columns: ColumnDef<Report>[] = [
  {
    accessorKey: 'reporterName',
    header: 'Segnalante',
  },
  {
    accessorKey: 'reportedName',
    header: 'Segnalato',
  },
  {
    accessorKey: 'reason',
    header: 'Motivo',
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = {
        pending: 'warning' as const,
        reviewed: 'outline' as const,
        resolved: 'success' as const,
      }[status] ?? 'outline' as const;

      const label = {
        pending: 'In attesa',
        reviewed: 'Revisionato',
        resolved: 'Risolto',
      }[status] ?? status;

      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Data',
    cell: ({ row }) =>
      new Date(row.getValue('createdAt')).toLocaleDateString('it-IT'),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Button variant="ghost" size="sm">
        Gestisci
      </Button>
    ),
  },
];

const mockReports: Report[] = [
  { id: '1', reporterName: 'Mario Rossi', reportedName: 'Luca Verdi', reason: 'Comportamento inappropriato', status: 'pending', createdAt: '2024-03-01' },
  { id: '2', reporterName: 'Anna Bianchi', reportedName: 'Giuseppe Neri', reason: 'Foto inappropriata', status: 'pending', createdAt: '2024-03-02' },
  { id: '3', reporterName: 'Chiara Blu', reportedName: 'Marco Gialli', reason: 'Spam', status: 'reviewed', createdAt: '2024-02-28' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Segnalazioni</h1>
        <p className="text-neutral-500">Gestisci le segnalazioni degli utenti</p>
      </div>

      <DataTable
        columns={columns}
        data={mockReports}
        total={mockReports.length}
        totalPages={1}
      />
    </div>
  );
}
