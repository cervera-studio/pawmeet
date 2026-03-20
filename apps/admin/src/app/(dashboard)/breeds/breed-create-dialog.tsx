'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { handleError } from '@/lib/error-handler';
import { type BreedFormValues, createBreedFormSchema } from '@/lib/schemas/breed';
import { createBreed } from './actions';
import { BREED_GROUPS, BreedFormFields, DEFAULT_SCORES } from './breed-form-fields';

const DEFAULT_VALUES: BreedFormValues = {
  code: '',
  group: BREED_GROUPS[0],
  sizeCategory: 'medium',
  avgWeightKg: 10,
  ...DEFAULT_SCORES,
};

interface BreedCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function BreedCreateDialog({ open, onClose, onCreated }: BreedCreateDialogProps) {
  const t = useTranslations('breeds');
  const tt = useTranslations('toast');
  const tv = useTranslations('validation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const breedFormSchema = useMemo(() => createBreedFormSchema(tv), [tv]);

  const form = useForm<BreedFormValues>({
    resolver: zodResolver(breedFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function resetAndClose() {
    form.reset(DEFAULT_VALUES);
    onClose();
  }

  async function handleCreate(data: BreedFormValues) {
    setIsSubmitting(true);
    try {
      await createBreed({
        code: data.code,
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
      resetAndClose();
      onCreated();
    } catch (error) {
      toast.error(handleError(error, tt('breeds.createError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={resetAndClose}
      title={t('createDialog.title')}
      description={t('createDialog.description')}
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(handleCreate)}
      submitLabel={t('createDialog.submit')}
    >
      <BreedFormFields idPrefix="create" form={form} />
    </DialogForm>
  );
}
