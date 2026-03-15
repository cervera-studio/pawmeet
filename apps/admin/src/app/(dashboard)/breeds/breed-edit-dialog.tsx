'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { handleError } from '@/lib/error-handler';
import { type BreedFormValues, breedFormSchema } from '@/lib/schemas/breed';
import { updateBreed } from './actions';
import { BREED_GROUPS, BreedFormFields, DEFAULT_SCORES, isSizeCategory } from './breed-form-fields';
import type { Breed } from './page.view-model';

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
      toast.error(handleError(error, "Errore durante l'aggiornamento della razza"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      title={t('editDialog.title')}
      description={t('editDialog.description', { name: breed?.name ?? '' })}
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(handleEdit)}
      submitLabel={tc('saveChanges')}
    >
      <BreedFormFields idPrefix="edit" form={form} />
    </DialogForm>
  );
}
