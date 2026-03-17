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
import { formatDateShort } from '@/lib/formatters';
import { promoteModel } from './actions';

interface ModelMetrics {
  rmse?: number;
  auc_roc?: number | null;
}

interface Model {
  id: string;
  version: string;
  trainingSamplesCount: number | null;
  metrics: unknown;
  isActive: boolean;
  promotedAt: string | Date | null;
  createdAt: string | Date;
}

interface ModelRegistryTableProps {
  models: Model[];
}

export function ModelRegistryTable({ models }: ModelRegistryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmVersion, setConfirmVersion] = useState<string | null>(null);

  function handlePromote(version: string) {
    startTransition(async () => {
      try {
        await promoteModel(version);
        toast.success(`Modello ${version} promosso`);
        setConfirmVersion(null);
        router.refresh();
      } catch {
        toast.error('Errore durante la promozione del modello');
      }
    });
  }

  if (models.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Nessun modello registrato.</p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Versione</TableHead>
            <TableHead>Campioni</TableHead>
            <TableHead>RMSE</TableHead>
            <TableHead>AUC-ROC</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Promosso il</TableHead>
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
                    <Badge variant="success">Attivo</Badge>
                  ) : (
                    <Badge variant="secondary">Inattivo</Badge>
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
                      Promuovi
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
            <DialogTitle>Conferma promozione</DialogTitle>
            <DialogDescription>
              Vuoi promuovere il modello <span className="font-mono">{confirmVersion}</span> in
              produzione? Il modello attuale verrà disattivato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVersion(null)} disabled={isPending}>
              Annulla
            </Button>
            <Button
              onClick={() => confirmVersion && handlePromote(confirmVersion)}
              disabled={isPending}
            >
              {isPending ? 'Promozione...' : 'Promuovi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
