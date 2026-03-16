'use client';

import { useState } from 'react';
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
import { EditFlagDialog } from './edit-flag-dialog';

interface Flag {
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  split: string;
}

interface FlagsTableProps {
  flags: Flag[];
  columns: {
    name: string;
    description: string;
    type: string;
    status: string;
    split: string;
  };
  labels: {
    enabled: string;
    disabled: string;
    edit: string;
  };
}

export function FlagsTable({ flags: initialFlags, columns, labels }: FlagsTableProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [editingFlag, setEditingFlag] = useState<Flag | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleEdit(flag: Flag) {
    setEditingFlag(flag);
    setDialogOpen(true);
  }

  function handleSave(name: string, enabled: boolean, splitPercentage: number) {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.name !== name) return f;
        return {
          ...f,
          enabled,
          split:
            f.type === 'experiment'
              ? `control: ${100 - splitPercentage}% / treatment: ${splitPercentage}%`
              : f.split,
        };
      }),
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.name}</TableHead>
            <TableHead>{columns.description}</TableHead>
            <TableHead>{columns.type}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead>{columns.split}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.name}>
              <TableCell className="font-mono text-sm">{flag.name}</TableCell>
              <TableCell>{flag.description}</TableCell>
              <TableCell>
                <Badge variant="outline">{flag.type}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={flag.enabled ? 'success' : 'secondary'}>
                  {flag.enabled ? labels.enabled : labels.disabled}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                {flag.split}
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
      />
    </>
  );
}
