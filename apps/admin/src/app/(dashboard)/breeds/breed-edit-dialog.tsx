'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type BreedFormValues, breedFormSchema } from '@/lib/schemas/breed';
import type { Breed } from './page.view-model';
import {
  BreedFormFields,
  BREED_GROUPS,
  DEFAULT_SCORES,
  isSizeCategory,
} from './breed-form-fields';
import { updateBreed } from './actions';

const DEFAULT_VALUES: BreedFormValues = {
  name: '',
  nameIt: '',
  group: BREED_GROUPS[0],
  sizeCategory: 'media',
  avgWeightKg: 10,
  ...DEFAULT_SCORES,
};

interface BreedEditDialogProps {
  breed: Breed | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function breedToFormValues(breed: Breed): BreedFormValues {
  const rawSize = breed.sizeCategory ?? '';
  const sizeCategory = isSizeCategory(rawSize) ? rawSize : 'media';
  return {
    name: breed.name,
    nameIt: breed.nameIt,
    group: (breed.group as BreedFormValues['group']) ?? BREED_GROUPS[0],
    sizeCategory,
    avgWeightKg: breed.avgWeightKg ?? 10,
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
  };
}

export function BreedEditDialog({ breed, open, onClose, onUpdated }: BreedEditDialogProps) {
  const t = useTranslations('breeds');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BreedFormValues>({
    resolver: zodResolver(breedFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (breed) {
      form.reset(breedToFormValues(breed));
    }
  }, [breed, form]);

  async function handleEdit(data: BreedFormValues) {
    if (!breed) return;
    setIsSubmitting(true);
    try {
      await updateBreed({
        id: breed.id,
        name: data.name,
        nameIt: data.nameIt,
        group: data.group ?? BREED_GROUPS[0],
        sizeCategory: data.sizeCategory,
        avgWeightKg: data.avgWeightKg,
        energy: data.energy ?? null,
        playfulness: data.playfulness ?? null,
        trainability: data.trainability ?? null,
        barking: data.barking ?? null,
        goodWithOtherDogs: data.goodWithOtherDogs ?? null,
        goodWithChildren: data.goodWithChildren ?? null,
        goodWithStrangers: data.goodWithStrangers ?? null,
        protectiveness: data.protectiveness ?? null,
        shedding: data.shedding ?? null,
        grooming: data.grooming ?? null,
      });
      onClose();
      onUpdated();
    } catch (error) {
      console.error('[Breeds] Failed to update:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editDialog.description', { name: breed?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleEdit)}>
          <BreedFormFields idPrefix="edit" form={form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : tc('saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
