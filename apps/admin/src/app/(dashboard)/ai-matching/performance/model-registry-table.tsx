'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { handleError } from '@/lib/error-handler';
import { formatDateShort } from '@/lib/formatters';
import type { ModelEntry } from './actions';
import { promoteModel } from './actions';

interface ModelMetrics {
  rmse?: number;
  auc_roc?: number | null;
}

// Centralized UI labels (Italian) — move to i18n when available
const LABELS = {
  noModels: 'Nessun modello registrato.',
  version: 'Versione',
  samples: 'Campioni',
  status: 'Stato',
  promotedAt: 'Promosso il',
  active: 'Attivo',
  inactive: 'Inattivo',
  promote: 'Promuovi',
  promoting: 'Promozione...',
  confirmTitle: 'Conferma promozione',
  confirmDescription: (version: string) =>
    `Vuoi promuovere il modello ${version} in produzione? Il modello attuale verrà disattivato.`,
  cancel: 'Annulla',
  promoted: (version: string) => `Modello ${version} promosso`,
  promoteError: 'Errore durante la promozione del modello',
} as const;

interface ModelRegistryTableProps {
  models: ModelEntry[];
}

export function ModelRegistryTable({ models }: ModelRegistryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmVersion, setConfirmVersion] = useState<string | null>(null);

  function handlePromote(version: string) {
    startTransition(async () => {
      try {
        await promoteModel(version);
        toast.success(LABELS.promoted(version));
        setConfirmVersion(null);
        router.refresh();
      } catch (error) {
        toast.error(handleError(error, LABELS.promoteError));
      }
    });
  }

  if (models.length === 0) {
    return <p className="text-sm text-neutral-500">{LABELS.noModels}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{LABELS.version}</TableHead>
            <TableHead>{LABELS.samples}</TableHead>
            <TableHead>RMSE</TableHead>
            <TableHead>AUC-ROC</TableHead>
            <TableHead>{LABELS.status}</TableHead>
            <TableHead>{LABELS.promotedAt}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => {
            const metrics = model.metrics as ModelMetrics | null;
            return (
              <TableRow key={model.id}>
                <TableCell className="font-mono text-sm">{model.version}</TableCell>
                <TableCell>{model.trainingSamplesCount ?? '\u2014'}</TableCell>
                <TableCell>{metrics?.rmse?.toFixed(4) ?? '\u2014'}</TableCell>
                <TableCell>{metrics?.auc_roc?.toFixed(4) ?? '\u2014'}</TableCell>
                <TableCell>
                  {model.isActive ? (
                    <Badge variant="success">{LABELS.active}</Badge>
                  ) : (
                    <Badge variant="secondary">{LABELS.inactive}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {model.promotedAt ? formatDateShort(String(model.promotedAt)) : '\u2014'}
                </TableCell>
                <TableCell>
                  {!model.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmVersion(model.version)}
                    >
                      {LABELS.promote}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={confirmVersion !== null} onOpenChange={() => setConfirmVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LABELS.confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmVersion ? LABELS.confirmDescription(confirmVersion) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVersion(null)} disabled={isPending}>
              {LABELS.cancel}
            </Button>
            <Button
              onClick={() => confirmVersion && handlePromote(confirmVersion)}
              disabled={isPending}
            >
              {isPending ? LABELS.promoting : LABELS.promote}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
