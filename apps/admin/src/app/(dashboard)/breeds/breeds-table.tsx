'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
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
import { Input } from '@/components/ui/input';
import { createBreed, deleteBreed, updateBreed } from './actions';
import { type Breed, type BreedsData, useBreedsViewModel } from './page.view-model';

const SIZE_CATEGORIES = ['toy', 'piccola', 'media', 'grande', 'gigante'] as const;
type SizeCategory = (typeof SIZE_CATEGORIES)[number];

const BREED_GROUPS = [
  'Herding',
  'Hound',
  'Non-Sporting',
  'Sporting',
  'Terrier',
  'Toy',
  'Working',
  'Miscellaneous',
] as const;

const SCORE_FIELDS = [
  'energy',
  'playfulness',
  'trainability',
  'barking',
  'goodWithOtherDogs',
  'goodWithChildren',
  'goodWithStrangers',
  'protectiveness',
  'shedding',
  'grooming',
] as const;
type ScoreField = (typeof SCORE_FIELDS)[number];

function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-300 dark:text-neutral-600">-</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-sm ${
            n <= value ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        />
      ))}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <select
        className="w-20 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-sm"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
      >
        <option value="">-</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
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

const DEFAULT_SCORES: Record<ScoreField, number | null> = {
  energy: null,
  playfulness: null,
  trainability: null,
  barking: null,
  goodWithOtherDogs: null,
  goodWithChildren: null,
  goodWithStrangers: null,
  protectiveness: null,
  shedding: null,
  grooming: null,
};

interface BreedsTableProps {
  initialData: BreedsData;
  pageSize: number;
}

export function BreedsTable({ initialData, pageSize }: BreedsTableProps) {
  const t = useTranslations('breeds');
  const tc = useTranslations('common');
  const vm = useBreedsViewModel(initialData, pageSize);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formNameIt, setFormNameIt] = useState('');
  const [formGroup, setFormGroup] = useState<string>(BREED_GROUPS[0]);
  const [formSizeCategory, setFormSizeCategory] = useState<SizeCategory>('media');
  const [formAvgWeight, setFormAvgWeight] = useState(10);
  const [formScores, setFormScores] = useState<Record<ScoreField, number | null>>({
    ...DEFAULT_SCORES,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setFormName('');
    setFormNameIt('');
    setFormGroup(BREED_GROUPS[0]);
    setFormSizeCategory('media');
    setFormAvgWeight(10);
    setFormScores({ ...DEFAULT_SCORES });
  }

  async function handleCreate() {
    setIsSubmitting(true);
    try {
      await createBreed({
        name: formName,
        nameIt: formNameIt,
        group: formGroup,
        sizeCategory: formSizeCategory,
        avgWeightKg: formAvgWeight,
        ...formScores,
      });
      setCreateDialogOpen(false);
      resetForm();
      void vm.refetch();
    } catch (error) {
      console.error('[Breeds] Failed to create:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!selectedBreed) return;
    setIsSubmitting(true);
    try {
      await updateBreed({
        id: selectedBreed.id,
        name: formName,
        nameIt: formNameIt,
        group: formGroup,
        sizeCategory: formSizeCategory,
        avgWeightKg: formAvgWeight,
        ...formScores,
      });
      setEditDialogOpen(false);
      setSelectedBreed(null);
      resetForm();
      void vm.refetch();
    } catch (error) {
      console.error('[Breeds] Failed to update:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedBreed) return;
    setIsSubmitting(true);
    try {
      await deleteBreed({ id: selectedBreed.id });
      setDeleteDialogOpen(false);
      setSelectedBreed(null);
      void vm.refetch();
    } catch (error) {
      console.error('[Breeds] Failed to delete:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const openEditDialog = useCallback((breed: Breed) => {
    setSelectedBreed(breed);
    setFormName(breed.name);
    setFormNameIt(breed.nameIt);
    setFormGroup(breed.group ?? BREED_GROUPS[0]);
    setFormSizeCategory((breed.sizeCategory as SizeCategory) ?? 'media');
    setFormAvgWeight(breed.avgWeightKg ?? 10);
    setFormScores({
      energy: breed.energy,
      playfulness: breed.playfulness,
      trainability: breed.trainability,
      barking: breed.barking,
      goodWithOtherDogs: breed.goodWithOtherDogs,
      goodWithChildren: breed.goodWithChildren,
      goodWithStrangers: breed.goodWithStrangers,
      protectiveness: breed.protectiveness,
      shedding: breed.shedding,
      grooming: breed.grooming,
    });
    setEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((breed: Breed) => {
    setSelectedBreed(breed);
    setDeleteDialogOpen(true);
  }, []);

  const columns: ColumnDef<Breed>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'nameIt',
        header: t('columns.nameIt'),
        cell: ({ row }) => (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {row.original.nameIt}
          </span>
        ),
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
    [t, openEditDialog, openDeleteDialog],
  );

  function renderBreedForm(idPrefix: string) {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-name`}>
            {t('columns.name')}
          </label>
          <Input
            id={`${idPrefix}-name`}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={t('createDialog.namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-name-it`}>
            {t('columns.nameIt')}
          </label>
          <Input
            id={`${idPrefix}-name-it`}
            value={formNameIt}
            onChange={(e) => setFormNameIt(e.target.value)}
            placeholder={t('createDialog.nameItPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-group`}>
            {t('columns.group')}
          </label>
          <select
            id={`${idPrefix}-group`}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            value={formGroup}
            onChange={(e) => setFormGroup(e.target.value)}
          >
            {BREED_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-size`}>
            {t('columns.sizeCategory')}
          </label>
          <select
            id={`${idPrefix}-size`}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            value={formSizeCategory}
            onChange={(e) => setFormSizeCategory(e.target.value as SizeCategory)}
          >
            {SIZE_CATEGORIES.map((size) => (
              <option key={size} value={size}>
                {t(
                  `sizes.${size}` as
                    | 'sizes.toy'
                    | 'sizes.piccola'
                    | 'sizes.media'
                    | 'sizes.grande'
                    | 'sizes.gigante',
                )}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-weight`}>
            {t('columns.avgWeightKg')}
          </label>
          <Input
            id={`${idPrefix}-weight`}
            type="number"
            value={formAvgWeight}
            onChange={(e) => setFormAvgWeight(Number(e.target.value))}
            min={0}
            step={0.1}
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('scores.title')}</span>
          <div className="grid grid-cols-2 gap-2">
            {SCORE_FIELDS.map((field) => (
              <ScoreInput
                key={field}
                label={t(`columns.${field}` as Parameters<typeof t>[0])}
                value={formScores[field]}
                onChange={(v) => setFormScores((prev) => ({ ...prev, [field]: v }))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
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
        <Button
          onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}
        >
          {t('createButton')}
        </Button>
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

      {/* Create Breed Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>{t('createDialog.description')}</DialogDescription>
          </DialogHeader>
          {renderBreedForm('create')}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formName || !formNameIt}>
              {isSubmitting ? tc('saving') : t('createDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Breed Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('editDialog.description', { name: selectedBreed?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          {renderBreedForm('edit')}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formName || !formNameIt}>
              {isSubmitting ? tc('saving') : tc('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: selectedBreed?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
