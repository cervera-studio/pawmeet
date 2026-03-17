'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { handleError } from '@/lib/error-handler';
import { deleteChallenge } from './actions';
import type { Challenge } from './page.view-model';

interface DeleteChallengeDialogProps {
  challenge: Challenge | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteChallengeDialog({
  challenge,
  open,
  onClose,
  onDeleted,
}: DeleteChallengeDialogProps) {
  const t = useTranslations('challenges');
  const tt = useTranslations('toast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!challenge) return;
    setIsSubmitting(true);
    try {
      await deleteChallenge({ challengeId: challenge.id });
      onClose();
      onDeleted();
    } catch (error) {
      toast.error(handleError(error, tt('challenges.deleteError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      title={t('deleteDialog.title')}
      description={t('deleteDialog.description', { title: challenge?.title ?? '' })}
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleDelete();
      }}
      submitLabel={t('deleteDialog.confirm')}
      submitVariant="destructive"
    >
      <div />
    </DialogForm>
  );
}
