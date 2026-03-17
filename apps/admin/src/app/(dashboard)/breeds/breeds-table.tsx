'use client';

import { getBreedName } from '@pawmeet/config';
import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BreedCreateDialog } from './breed-create-dialog';
import { BreedDeleteDialog } from './breed-delete-dialog';
import { BreedEditDialog } from './breed-edit-dialog';
import { BREED_GROUPS } from './breed-form-fields';
import { type Breed, type BreedsData, useBreedsViewModel } from './page.view-model';

function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-300">-</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-sm ${n <= value ? 'bg-primary' : 'bg-neutral-200'}`}
        />
      ))}
    </div>
  );
}

function getSizeBadgeVariant(size: string) {
  switch (size) {
    case 'toy':
      return 'outline' as const;
    case 'piccola':
      return 'secondary' as const;
    case 'media':
      return 'default' as const;
    case 'grande':
      return 'success' as const;
    case 'gigante':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

interface BreedsTableProps {
  initialData: BreedsData;
  pageSize: number;
}

export function BreedsTable({ initialData, pageSize }: BreedsTableProps) {
  const t = useTranslations('breeds');
  const locale = useLocale();
  const vm = useBreedsViewModel(initialData, pageSize);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);

  const openEditDialog = useCallback((breed: Breed) => {
    setSelectedBreed(breed);
    setEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((breed: Breed) => {
    setSelectedBreed(breed);
    setDeleteDialogOpen(true);
  }, []);

  const columns: ColumnDef<Breed>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: t('columns.name'),
        cell: ({ row }) => {
          const code = row.original.code;
          const displayName = getBreedName(code, locale);
          return (
            <div>
              <span className="font-medium">{displayName}</span>
              {displayName !== code && (
                <span className="ml-2 text-xs text-neutral-400">{code}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'group',
        header: t('columns.group'),
        cell: ({ row }) => <span className="text-sm">{row.original.group}</span>,
      },
      {
        accessorKey: 'sizeCategory',
        header: t('columns.sizeCategory'),
        cell: ({ row }) => {
          const size = row.original.sizeCategory ?? 'media';
          const key = `sizes.${size}` as
            | 'sizes.toy'
            | 'sizes.piccola'
            | 'sizes.media'
            | 'sizes.grande'
            | 'sizes.gigante';
          return <Badge variant={getSizeBadgeVariant(size)}>{t(key)}</Badge>;
        },
      },
      {
        accessorKey: 'avgWeightKg',
        header: t('columns.avgWeightKg'),
        cell: ({ row }) => <span className="text-sm">{row.original.avgWeightKg} kg</span>,
      },
      {
        id: 'scores',
        header: t('scores.title'),
        cell: ({ row }) => {
          const b = row.original;
          const hasScores = b.energy !== null;
          if (!hasScores) {
            return <span className="text-xs text-neutral-400">{t('scores.noData')}</span>;
          }
          return (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-8 text-neutral-500">{t('columns.energy').slice(0, 3)}</span>
                <ScoreBar value={b.energy} />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-8 text-neutral-500">{t('columns.playfulness').slice(0, 3)}</span>
                <ScoreBar value={b.playfulness} />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-8 text-neutral-500">
                  {t('columns.trainability').slice(0, 3)}
                </span>
                <ScoreBar value={b.trainability} />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-8 text-neutral-500">
                  {t('columns.goodWithOtherDogs').slice(0, 3)}
                </span>
                <ScoreBar value={b.goodWithOtherDogs} />
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('searchPlaceholder')}
            className="max-w-sm"
            value={vm.search}
            onChange={(e) => vm.setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            value={vm.groupFilter ?? ''}
            onChange={(e) => vm.setGroupFilter(e.target.value || undefined)}
          >
            <option value="">{t('allGroups')}</option>
            {BREED_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
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

      <BreedCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => void vm.refetch()}
      />

      <BreedEditDialog
        breed={selectedBreed}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedBreed(null);
        }}
        onUpdated={() => void vm.refetch()}
      />

      <BreedDeleteDialog
        breed={selectedBreed}
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedBreed(null);
        }}
        onDeleted={() => void vm.refetch()}
      />
    </>
  );
}
