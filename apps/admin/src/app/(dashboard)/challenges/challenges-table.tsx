'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChallengeEditDialog } from './challenge-edit-dialog';
import { CreateChallengeDialog } from './create-challenge-dialog';
import { DeleteChallengeDialog } from './delete-challenge-dialog';
import { type Challenge, type ChallengesData, useChallengesViewModel } from './page.view-model';

function getChallengeStatus(
  startsAt: string | Date,
  endsAt: string | Date,
): 'active' | 'expired' | 'upcoming' {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

function StatusBadge({ status }: { status: 'active' | 'expired' | 'upcoming' }) {
  const t = useTranslations('challenges');
  const variantMap: Record<'active' | 'expired' | 'upcoming', 'success' | 'secondary' | 'default'> =
    {
      active: 'success',
      expired: 'secondary',
      upcoming: 'default',
    };
  return <Badge variant={variantMap[status]}>{t(`statuses.${status}`)}</Badge>;
}

function formatDate(date: string | Date, locale: string): string {
  const dateLocale = { it: 'it-IT', en: 'en-US', es: 'es-ES', ro: 'ro-RO' }[locale] ?? 'it-IT';
  return new Date(date).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface ChallengesTableProps {
  initialData: ChallengesData;
  pageSize: number;
}

export function ChallengesTable({ initialData, pageSize }: ChallengesTableProps) {
  const t = useTranslations('challenges');
  const locale = useLocale();
  const vm = useChallengesViewModel(initialData, pageSize);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const openEditDialog = useCallback((challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setDeleteDialogOpen(true);
  }, []);

  const columns: ColumnDef<Challenge>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: t('columns.type'),
        cell: ({ row }) => <Badge variant="outline">{t(`types.${row.original.type}`)}</Badge>,
      },
      {
        accessorKey: 'title',
        header: t('columns.title'),
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'targetValue',
        header: t('columns.target'),
        cell: ({ row }) => <span className="text-sm">{row.original.targetValue}</span>,
      },
      {
        accessorKey: 'xpReward',
        header: t('columns.xpReward'),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {row.original.xpReward} XP
          </span>
        ),
      },
      {
        accessorKey: 'startsAt',
        header: t('columns.startsAt'),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.startsAt, locale)}</span>
        ),
      },
      {
        accessorKey: 'endsAt',
        header: t('columns.endsAt'),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.endsAt, locale)}</span>
        ),
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          const status = getChallengeStatus(row.original.startsAt, row.original.endsAt);
          return <StatusBadge status={status} />;
        },
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}>
              {t('actions.edit')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => openDeleteDialog(row.original)}>
              {t('actions.delete')}
            </Button>
          </div>
        ),
      },
    ],
    [t, locale, openEditDialog, openDeleteDialog],
  );

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>{t('createButton')}</Button>
      </div>

      <DataTable
        columns={columns}
        data={vm.data ?? []}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />

      <CreateChallengeDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => void vm.refetch()}
      />

      <ChallengeEditDialog
        challenge={selectedChallenge}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedChallenge(null);
        }}
        onUpdated={() => void vm.refetch()}
      />

      <DeleteChallengeDialog
        challenge={selectedChallenge}
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedChallenge(null);
        }}
        onDeleted={() => void vm.refetch()}
      />
    </>
  );
}
