'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
import { promoteModel } from './actions';
import type { ModelEntry } from './types';

interface ModelMetrics {
  rmse?: number;
  auc_roc?: number | null;
}

interface ModelRegistryTableProps {
  models: ModelEntry[];
}

export function ModelRegistryTable({ models }: ModelRegistryTableProps) {
  const t = useTranslations('aiMatching.performance.modelRegistry');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmVersion, setConfirmVersion] = useState<string | null>(null);

  function handlePromote(version: string) {
    startTransition(async () => {
      try {
        await promoteModel(version);
        toast.success(t('promoted', { version }));
        setConfirmVersion(null);
        router.refresh();
      } catch (error) {
        toast.error(handleError(error, t('promoteError')));
      }
    });
  }

  if (models.length === 0) {
    return <p className="text-sm text-neutral-500">{t('noModels')}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('version')}</TableHead>
            <TableHead>{t('samples')}</TableHead>
            <TableHead>RMSE</TableHead>
            <TableHead>AUC-ROC</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('promotedAt')}</TableHead>
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
                    <Badge variant="success">{t('active')}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('inactive')}</Badge>
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
                      {t('promote')}
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
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>
              {confirmVersion ? t('confirmDescription', { version: confirmVersion }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVersion(null)} disabled={isPending}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => confirmVersion && handlePromote(confirmVersion)}
              disabled={isPending}
            >
              {isPending ? t('promoting') : t('promote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
