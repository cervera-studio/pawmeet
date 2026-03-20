'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { updateChallenge } from './actions';
import type { Challenge } from './page.view-model';

function toLocalDatetime(isoOrDate: string | Date): string {
  const d = new Date(isoOrDate);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface ChallengeEditDialogProps {
  challenge: Challenge | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ChallengeEditDialog({
  challenge,
  open,
  onClose,
  onUpdated,
}: ChallengeEditDialogProps) {
  const t = useTranslations('challenges');
  const tt = useTranslations('toast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(1);
  const [xpReward, setXpReward] = useState(50);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    if (challenge) {
      setTitle(challenge.title);
      setDescription(challenge.description ?? '');
      setTargetValue(challenge.targetValue);
      setXpReward(challenge.xpReward);
      setStartsAt(toLocalDatetime(challenge.startsAt));
      setEndsAt(toLocalDatetime(challenge.endsAt));
    }
  }, [challenge]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setIsSubmitting(true);
    try {
      await updateChallenge({
        challengeId: challenge.id,
        title,
        description,
        targetValue,
        xpReward,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      onClose();
      onUpdated();
    } catch (error) {
      toast.error(handleError(error, tt('challenges.updateError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      title={t('editDialog.title')}
      description={t('editDialog.description', { title: challenge?.title ?? '' })}
      isSubmitting={isSubmitting}
      onSubmit={handleUpdate}
      submitLabel={t('editDialog.submit')}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="edit-challenge-type" className="mb-1 block text-sm font-medium">
            {t('columns.type')}
          </label>
          <Input id="edit-challenge-type" value={challenge?.type ?? ''} disabled />
        </div>

        <div>
          <label htmlFor="edit-challenge-title" className="mb-1 block text-sm font-medium">
            {t('columns.title')}
          </label>
          <Input
            id="edit-challenge-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="edit-challenge-description" className="mb-1 block text-sm font-medium">
            {t('createDialog.descriptionLabel')}
          </label>
          <textarea
            id="edit-challenge-description"
            className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-challenge-target" className="mb-1 block text-sm font-medium">
              {t('columns.target')}
            </label>
            <Input
              id="edit-challenge-target"
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-challenge-xp" className="mb-1 block text-sm font-medium">
              {t('columns.xpReward')}
            </label>
            <Input
              id="edit-challenge-xp"
              type="number"
              min={1}
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-challenge-starts" className="mb-1 block text-sm font-medium">
              {t('columns.startsAt')}
            </label>
            <Input
              id="edit-challenge-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-challenge-ends" className="mb-1 block text-sm font-medium">
              {t('columns.endsAt')}
            </label>
            <Input
              id="edit-challenge-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
    </DialogForm>
  );
}
