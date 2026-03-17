'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateFlag } from './actions';
import { EditFlagDialog } from './edit-flag-dialog';

interface Flag {
  name: string;
  enabled: boolean;
  splitPercent: number;
}

interface FlagsTableProps {
  flags: Flag[];
  columns: {
    name: string;
    status: string;
    split: string;
  };
  labels: {
    enabled: string;
    disabled: string;
    edit: string;
  };
}

export function FlagsTable({ flags, columns, labels }: FlagsTableProps) {
  const router = useRouter();
  const [editingFlag, setEditingFlag] = useState<Flag | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEdit(flag: Flag) {
    setEditingFlag(flag);
    setDialogOpen(true);
  }

  function handleSave(name: string, enabled: boolean, splitPercent: number) {
    startTransition(async () => {
      try {
        await updateFlag(name, enabled, splitPercent);
        toast.success(`Flag ${name} aggiornato`);
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error('Errore durante il salvataggio');
      }
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.name}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead>{columns.split}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.name}>
              <TableCell className="font-mono text-sm">{flag.name}</TableCell>
              <TableCell>
                <Badge variant={flag.enabled ? 'success' : 'secondary'}>
                  {flag.enabled ? labels.enabled : labels.disabled}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-neutral-500">
                {flag.splitPercent}%
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => handleEdit(flag)}>
                  {labels.edit}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditFlagDialog
        flag={editingFlag}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        isPending={isPending}
      />
    </>
  );
}
