'use client';

import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { createBreed, deleteBreed, fetchBreeds, updateBreed } from './actions';

interface Breed {
  id: number;
  name: string;
  nameIt: string;
  group: string | null;
  sizeCategory: string | null;
  avgWeightKg: number | null;
}

interface BreedsData {
  data: Breed[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BreedsTableProps {
  initialData: BreedsData;
  pageSize: number;
}

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

export function BreedsTable({ initialData, pageSize }: BreedsTableProps) {
  const t = useTranslations('breeds');
  const tc = useTranslations('common');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<BreedsData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInitialState = pagination.pageIndex === 0 && debouncedSearch === '' && !groupFilter;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchBreeds({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        group: groupFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[Breeds] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, groupFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadData();
  }, [loadData, isInitialState]);

  function resetForm() {
    setFormName('');
    setFormNameIt('');
    setFormGroup(BREED_GROUPS[0]);
    setFormSizeCategory('media');
    setFormAvgWeight(10);
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
      });
      setCreateDialogOpen(false);
      resetForm();
      void loadData();
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
      });
      setEditDialogOpen(false);
      setSelectedBreed(null);
      resetForm();
      void loadData();
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
      void loadData();
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
        cell: ({ row }) => <span className="text-sm text-neutral-500">{row.original.nameIt}</span>,
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

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('searchPlaceholder')}
            className="max-w-sm"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={groupFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setGroupFilter(v || undefined);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
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
        data={data.data ?? []}
        total={data.total}
        totalPages={Math.ceil(data.total / pagination.pageSize)}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* Create Breed Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>{t('createDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-name">
                {t('columns.name')}
              </label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('createDialog.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-name-it">
                {t('columns.nameIt')}
              </label>
              <Input
                id="create-name-it"
                value={formNameIt}
                onChange={(e) => setFormNameIt(e.target.value)}
                placeholder={t('createDialog.nameItPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-group">
                {t('columns.group')}
              </label>
              <select
                id="create-group"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
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
              <label className="text-sm font-medium" htmlFor="create-size">
                {t('columns.sizeCategory')}
              </label>
              <select
                id="create-size"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
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
              <label className="text-sm font-medium" htmlFor="create-weight">
                {t('columns.avgWeightKg')}
              </label>
              <Input
                id="create-weight"
                type="number"
                value={formAvgWeight}
                onChange={(e) => setFormAvgWeight(Number(e.target.value))}
                min={0}
                step={0.1}
              />
            </div>
          </div>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-name">
                {t('columns.name')}
              </label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-name-it">
                {t('columns.nameIt')}
              </label>
              <Input
                id="edit-name-it"
                value={formNameIt}
                onChange={(e) => setFormNameIt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-group">
                {t('columns.group')}
              </label>
              <select
                id="edit-group"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
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
              <label className="text-sm font-medium" htmlFor="edit-size">
                {t('columns.sizeCategory')}
              </label>
              <select
                id="edit-size"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
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
              <label className="text-sm font-medium" htmlFor="edit-weight">
                {t('columns.avgWeightKg')}
              </label>
              <Input
                id="edit-weight"
                type="number"
                value={formAvgWeight}
                onChange={(e) => setFormAvgWeight(Number(e.target.value))}
                min={0}
                step={0.1}
              />
            </div>
          </div>
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
