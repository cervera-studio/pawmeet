'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { BreedFormFields, BREED_GROUPS, DEFAULT_SCORES } from './breed-form-fields';
import { createBreed } from './actions';

const DEFAULT_VALUES: BreedFormValues = {
  name: '',
  nameIt: '',
  group: BREED_GROUPS[0],
  sizeCategory: 'media',
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
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      resetAndClose();
      onCreated();
    } catch (error) {
      console.error('[Breeds] Failed to create:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleCreate)}>
          <BreedFormFields idPrefix="create" form={form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('createDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
