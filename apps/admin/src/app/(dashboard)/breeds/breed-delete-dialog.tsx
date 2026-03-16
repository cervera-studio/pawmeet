'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { handleError } from '@/lib/error-handler';
import { deleteBreed } from './actions';
import type { Breed } from './page.view-model';

interface BreedDeleteDialogProps {
  breed: Breed | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function BreedDeleteDialog({ breed, open, onClose, onDeleted }: BreedDeleteDialogProps) {
  const t = useTranslations('breeds');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!breed) return;
    setIsSubmitting(true);
    try {
      await deleteBreed({ id: breed.id });
      onClose();
      onDeleted();
    } catch (error) {
      toast.error(handleError(error, "Errore durante l'eliminazione della razza"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      title={t('deleteDialog.title')}
      description={t('deleteDialog.description', { code: breed?.code ?? '' })}
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleDelete();
      }}
      submitLabel={t('deleteDialog.confirm')}
      submitVariant="destructive"
    >
      {/* No additional form fields for delete confirmation */}
      <div />
    </DialogForm>
  );
}
