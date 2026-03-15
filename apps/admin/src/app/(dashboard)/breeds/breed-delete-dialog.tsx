'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Breed } from './page.view-model';
import { deleteBreed } from './actions';

interface BreedDeleteDialogProps {
  breed: Breed | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function BreedDeleteDialog({ breed, open, onClose, onDeleted }: BreedDeleteDialogProps) {
  const t = useTranslations('breeds');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!breed) return;
    setIsSubmitting(true);
    try {
      await deleteBreed({ id: breed.id });
      onClose();
      onDeleted();
    } catch (error) {
      console.error('[Breeds] Failed to delete:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('deleteDialog.description', { name: breed?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : t('deleteDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
